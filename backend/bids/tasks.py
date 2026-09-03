"""
Celery tasks for Bid Module (Module 7).
Handles deadline locking, document verification, notifications.
"""

try:
    from celery import shared_task
except ImportError:
    def shared_task(func=None, **kwargs):
        def decorator(f):
            f.delay = lambda *a, **k: f(*a, **k)
            return f
        if func:
            return decorator(func)
        return decorator

import logging

logger = logging.getLogger(__name__)


@shared_task
def lock_expired_bids_task():
    """
    Periodic task to lock bids that have passed their submission deadline.
    Run via Celery Beat every minute.
    Uses server time — never trusts client timestamps.
    """
    try:
        from .services import BidLifecycleService
        locked_count = BidLifecycleService.lock_expired_bids()
        logger.info(f"[Bid Locking] Locked {locked_count} expired bids.")
        return {"locked": locked_count, "status": "success"}
    except Exception as e:
        logger.error(f"[Bid Locking] Error: {str(e)}")
        return {"error": str(e), "status": "failed"}


@shared_task
def verify_document_task(document_id):
    """
    Async document verification workflow:
    Upload → Object Storage → Celery Job → Scan → Verify → Status Update
    """
    try:
        from .models import BidDocument, BidDocumentVerificationStatus
        doc = BidDocument.objects.get(id=document_id)

        doc.verification_status = BidDocumentVerificationStatus.SCANNING
        doc.save(update_fields=['verification_status'])

        # In production: run malware scan, OCR, metadata extraction
        # For now: auto-verify after scanning phase
        doc.verification_status = BidDocumentVerificationStatus.VERIFIED
        doc.save(update_fields=['verification_status', 'verified_at'])

        from django.utils import timezone
        doc.verified_at = timezone.now()
        doc.save(update_fields=['verified_at'])

        logger.info(f"[Document Verify] Document {doc.original_filename} verified.")
        return {"document_id": str(document_id), "status": "verified"}
    except Exception as e:
        logger.error(f"[Document Verify] Error: {str(e)}")
        return {"error": str(e), "status": "failed"}


@shared_task
def send_bid_notification_task(bid_id, event_type, recipient_ids=None):
    """
    Send notifications for bid events.
    Events: BID_CREATED, BID_SUBMITTED, DOCUMENT_VERIFIED, BID_LOCKED, etc.
    """
    try:
        from .models import Bid, BidAccessLog
        from vendors.models import VendorNotification

        bid = Bid.objects.get(id=bid_id)

        notification_map = {
            'BID_CREATED': ('Bid Created', f'Your bid {bid.bid_reference} has been created.'),
            'BID_SUBMITTED': ('Bid Submitted', f'Your bid {bid.bid_reference} has been submitted for evaluation.'),
            'BID_LOCKED': ('Bid Locked', f'Your bid {bid.bid_reference} has been locked. No further modifications allowed.'),
            'BID_AMENDED': ('Bid Amended', f'Your bid {bid.bid_reference} has been amended.'),
            'BID_WITHDRAWN': ('Bid Withdrawn', f'Your bid {bid.bid_reference} has been withdrawn.'),
            'TECHNICAL_OPENED': ('Technical Opening', f'Technical bids have been opened for {bid.tender.tender_number}.'),
            'FINANCIAL_OPENED': ('Financial Opening', f'Financial bids have been opened for {bid.tender.tender_number}.'),
            'DOCUMENT_VERIFIED': ('Document Verified', f'A document in your bid {bid.bid_reference} has been verified.'),
            'DOCUMENT_REJECTED': ('Document Rejected', f'A document in your bid {bid.bid_reference} was rejected.'),
        }

        title, message = notification_map.get(event_type, (event_type, f'Event {event_type} occurred for bid {bid.bid_reference}'))

        # Send to bid vendor
        VendorNotification.objects.create(
            vendor=bid.vendor,
            title=title,
            message=message,
            notification_type='INFO',
            link=f'/bids/{bid.id}',
        )

        logger.info(f"[Notification] {event_type} sent for bid {bid.bid_reference}")
        return {"bid_id": str(bid_id), "event": event_type, "status": "sent"}
    except Exception as e:
        logger.error(f"[Notification] Error: {str(e)}")
        return {"error": str(e), "status": "failed"}


@shared_task
def check_deadline_and_notify_task():
    """
    Periodic task to check for approaching deadlines and notify vendors.
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from tenders.models import Tender, TenderStatus
        from .models import Bid, BidStatus

        # Find tenders with deadlines in the next 24 hours
        soon = timezone.now() + timedelta(hours=24)
        soon_tenders = Tender.objects.filter(
            submission_deadline__lte=soon,
            submission_deadline__gt=timezone.now(),
            status__in=[TenderStatus.ACTIVE, TenderStatus.PUBLISHED],
            is_deleted=False,
        )

        notified = 0
        for tender in soon_tenders:
            # Notify all vendors with draft/in-progress bids for this tender
            affected_bids = Bid.objects.filter(
                tender=tender,
                status__in=[BidStatus.DRAFT, BidStatus.SUBMISSION_IN_PROGRESS],
                is_deleted=False,
            )
            for bid in affected_bids:
                send_bid_notification_task.delay(
                    str(bid.id), 'DEADLINE_APPROACHING'
                )
                notified += 1

        logger.info(f"[Deadline Check] Notified {notified} vendors of approaching deadlines.")
        return {"notified": notified, "status": "success"}
    except Exception as e:
        logger.error(f"[Deadline Check] Error: {str(e)}")
        return {"error": str(e), "status": "failed"}
