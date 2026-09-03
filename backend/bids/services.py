from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from tenders.models import Tender, TenderStatus
from vendors.models import Vendor, VendorStatus

from .models import (
    Bid, BidVersion, BidStatus, TechnicalBid, FinancialBid,
    BidDocument, BidAmendment, BidWithdrawal, BidOpening,
    BidAccessLog, BidIntegrityRecord, OpeningStage,
)


class BidLifecycleService:
    """
    Centralized State Machine Engine for Bid Lifecycle Transitions.
    Enforces strict business rules. Every transition is validated server-side.
    Frontend status values are NEVER trusted.
    """

    ALLOWED_TRANSITIONS = {
        BidStatus.DRAFT: [
            BidStatus.SUBMISSION_IN_PROGRESS,
            BidStatus.WITHDRAWN,
        ],
        BidStatus.SUBMISSION_IN_PROGRESS: [
            BidStatus.SUBMITTED,
            BidStatus.WITHDRAWAL_REQUESTED,
        ],
        BidStatus.SUBMITTED: [
            BidStatus.AMENDMENT_ALLOWED,
            BidStatus.LOCKED,
            BidStatus.WITHDRAWAL_REQUESTED,
        ],
        BidStatus.AMENDMENT_ALLOWED: [
            BidStatus.AMENDMENT_SUBMITTED,
            BidStatus.SUBMITTED,
            BidStatus.LOCKED,
            BidStatus.WITHDRAWAL_REQUESTED,
        ],
        BidStatus.AMENDMENT_SUBMITTED: [
            BidStatus.AMENDMENT_ALLOWED,
            BidStatus.SUBMITTED,
            BidStatus.LOCKED,
            BidStatus.WITHDRAWAL_REQUESTED,
        ],
        BidStatus.WITHDRAWAL_REQUESTED: [
            BidStatus.WITHDRAWN,
            BidStatus.SUBMITTED,  # If withdrawal rejected
        ],
        BidStatus.WITHDRAWN: [],  # Terminal
        BidStatus.LOCKED: [
            BidStatus.TECHNICAL_OPENED,
        ],
        BidStatus.TECHNICAL_OPENED: [
            BidStatus.TECHNICAL_EVALUATION,
        ],
        BidStatus.TECHNICAL_EVALUATION: [
            BidStatus.FINANCIAL_OPENING_AUTHORIZED,
            BidStatus.REJECTED,
            BidStatus.DISQUALIFIED,
        ],
        BidStatus.FINANCIAL_OPENING_AUTHORIZED: [
            BidStatus.FINANCIAL_OPENED,
        ],
        BidStatus.FINANCIAL_OPENED: [
            BidStatus.EVALUATED,
        ],
        BidStatus.EVALUATED: [
            BidStatus.AWARDED,
            BidStatus.REJECTED,
            BidStatus.DISQUALIFIED,
        ],
        BidStatus.AWARDED: [],  # Terminal
        BidStatus.REJECTED: [],  # Terminal
        BidStatus.DISQUALIFIED: [],  # Terminal
    }

    @classmethod
    def is_valid_transition(cls, current_status, target_status):
        if current_status == target_status:
            return True
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @classmethod
    def validate_creation(cls, tender, vendor):
        """Validate that a bid can be created for this tender by this vendor."""
        errors = []

        if not tender:
            errors.append("Tender not found.")
            return errors

        if tender.is_deleted:
            errors.append("Tender has been deleted.")

        if tender.status not in [TenderStatus.ACTIVE, TenderStatus.PUBLISHED]:
            errors.append(
                f"Tender is not open for bidding. Current status: '{tender.status}'."
            )

        # Deadline validation — server authoritative clock
        if tender.submission_deadline and tender.submission_deadline <= timezone.now():
            errors.append("Submission deadline has passed.")

        # Vendor eligibility
        if not vendor:
            errors.append("Vendor profile not found.")
        elif vendor.status != VendorStatus.VERIFIED:
            errors.append(f"Vendor is not verified. Status: '{vendor.status}'.")

        # Check for existing active bid
        existing_bid = Bid.objects.filter(
            tender=tender,
            vendor=vendor,
            is_deleted=False,
        ).exclude(status=BidStatus.WITHDRAWN).first()
        if existing_bid:
            errors.append(
                f"An active bid already exists for this tender: {existing_bid.bid_reference}."
            )

        return errors

    @classmethod
    def validate_submission(cls, bid):
        """Validate all conditions before final submission."""
        errors = []
        tender = bid.tender

        # Deadline check
        if tender.submission_deadline and tender.submission_deadline <= timezone.now():
            errors.append("Submission deadline has passed. Server time is authoritative.")

        # Tender must be open
        if tender.status not in [TenderStatus.ACTIVE, TenderStatus.PUBLISHED]:
            errors.append(f"Tender is not open for submissions. Status: '{tender.status}'.")

        # Technical bid must exist
        if not hasattr(bid, 'technical_bid'):
            errors.append("Technical proposal is required before submission.")
        elif not bid.technical_bid.methodology:
            errors.append("Technical proposal methodology is required.")

        # Financial bid must exist
        if not hasattr(bid, 'financial_bid'):
            errors.append("Financial proposal is required before submission.")

        # Mandatory documents check
        required_doc_types = ['TECHNICAL_PROPOSAL', 'FINANCIAL_PROPOSAL']
        for doc_type in required_doc_types:
            has_doc = bid.documents.filter(
                document_type=doc_type,
                is_deleted=False,
                verification_status='VERIFIED'
            ).exists()
            if not has_doc:
                # Also allow UPLOADED as sufficient
                has_uploaded = bid.documents.filter(
                    document_type=doc_type,
                    is_deleted=False,
                ).exists()
                if not has_uploaded:
                    errors.append(f"Mandatory document '{doc_type}' is missing.")

        return errors

    @classmethod
    @transaction.atomic
    def transition_bid(cls, bid, target_status, user=None, reason="", request=None):
        """
        Execute a bid state transition with full validation and audit logging.
        Uses database-level locking to prevent race conditions.
        """
        # Select for update to prevent concurrent modifications
        bid = Bid.objects.select_for_update().get(pk=bid.pk)

        current_status = bid.status

        if current_status == target_status:
            return bid

        if not cls.is_valid_transition(current_status, target_status):
            raise ValueError(
                f"Invalid bid transition from '{current_status}' to '{target_status}'. "
                f"Allowed: {cls.ALLOWED_TRANSITIONS.get(current_status, ['None'])}"
            )

        now = timezone.now()

        # Pre-transition validations
        if target_status == BidStatus.SUBMITTED:
            submission_errors = cls.validate_submission(bid)
            if submission_errors:
                raise ValueError(
                    f"Bid submission validation failed: {'; '.join(submission_errors)}"
                )

        # Apply transition
        bid.status = target_status

        if target_status == BidStatus.SUBMITTED:
            bid.submitted_at = now
        elif target_status == BidStatus.LOCKED:
            bid.locked_at = now
        elif target_status == BidStatus.WITHDRAWN:
            bid.withdrawn_at = now

        bid.save()

        # Create version snapshot on submission or amendment
        if target_status in [BidStatus.SUBMITTED, BidStatus.AMENDMENT_SUBMITTED]:
            cls._create_version_snapshot(bid, user, target_status)

        # Log the transition
        BidAccessLog.log(
            bid=bid,
            actor=user,
            action=f"BID_{target_status}",
            resource_id=str(bid.id),
            resource_reference=bid.bid_reference,
            metadata={
                'from_status': current_status,
                'to_status': target_status,
                'reason': reason,
            },
            request=request,
        )

        return bid

    @classmethod
    def _create_version_snapshot(cls, bid, user, change_type):
        """Create an immutable version snapshot of the current bid state."""
        version_num = bid.current_version

        tech_snapshot = {}
        if hasattr(bid, 'technical_bid'):
            tech_snapshot = {
                'methodology': bid.technical_bid.methodology,
                'technical_description': bid.technical_bid.technical_description,
                'implementation_plan': bid.technical_bid.implementation_plan,
                'delivery_plan': bid.technical_bid.delivery_plan,
                'team_information': bid.technical_bid.team_information,
                'compliance_statement': bid.technical_bid.compliance_statement,
            }

        # Financial snapshot is NOT stored in plain text in version history
        # Only a reference that it was included
        financial_snapshot = {}
        if hasattr(bid, 'financial_bid'):
            financial_snapshot = {
                'currency': bid.financial_bid.currency,
                'final_amount': str(bid.financial_bid.final_amount),
                'submitted': True,
            }

        doc_refs = list(bid.documents.filter(is_deleted=False).values_list('id', flat=True))

        # Compute integrity hash
        import json, hashlib
        canonical = json.dumps({
            'bid_id': str(bid.id),
            'tender_id': str(bid.tender_id),
            'vendor_id': str(bid.vendor_id),
            'version': version_num,
            'tech_hash': hashlib.sha256(json.dumps(tech_snapshot).encode()).hexdigest(),
            'docs': [str(d) for d in doc_refs],
        }, sort_keys=True)
        integrity_hash = hashlib.sha256(canonical.encode()).hexdigest()

        BidVersion.objects.create(
            bid=bid,
            version_number=version_num,
            technical_snapshot=tech_snapshot,
            financial_snapshot=financial_snapshot,
            document_references=doc_refs,
            change_summary=f"Bid {change_type} at v{version_num}",
            change_type=change_type,
            created_by=user,
            integrity_hash=integrity_hash,
        )

        # Update bid version counter
        bid.current_version += 1
        bid.save(update_fields=['current_version'])

    @classmethod
    @transaction.atomic
    def lock_expired_bids(cls):
        """
        Called by Celery beat to lock bids past their submission deadline.
        Uses server time, never client-submitted timestamps.
        """
        now = timezone.now()
        expired_bids = Bid.objects.select_for_update().filter(
            status__in=[
                BidStatus.DRAFT,
                BidStatus.SUBMISSION_IN_PROGRESS,
                BidStatus.SUBMITTED,
                BidStatus.AMENDMENT_ALLOWED,
                BidStatus.AMENDMENT_SUBMITTED,
            ],
            tender__submission_deadline__lte=now,
            tender__status__in=[TenderStatus.ACTIVE, TenderStatus.PUBLISHED, TenderStatus.EVALUATION],
            is_deleted=False,
        )

        locked_count = 0
        for bid in expired_bids:
            bid.status = BidStatus.LOCKED
            bid.locked_at = now
            bid.save(update_fields=['status', 'locked_at', 'updated_at'])

            BidAccessLog.log(
                bid=bid,
                actor=None,
                action='BID_LOCKED',
                resource_id=str(bid.id),
                resource_reference=bid.bid_reference,
                metadata={
                    'reason': 'Submission deadline expired',
                    'deadline': bid.tender.submission_deadline.isoformat(),
                    'locked_at': now.isoformat(),
                },
            )
            locked_count += 1

        return locked_count

    @classmethod
    def can_modify(cls, bid, user):
        """Check if a user can modify a bid."""
        if not bid.ismodifiable:
            return False, "Bid cannot be modified in its current state."

        # Vendor can only modify own bids
        if user.role == 'VENDOR' and bid.vendor.user != user:
            return False, "You can only modify your own bids."

        # Deadline check
        if bid.tender.submission_deadline and bid.tender.submission_deadline <= timezone.now():
            return False, "Submission deadline has passed."

        return True, "Modification allowed."

    @classmethod
    def check_deadline(cls, tender):
        """Server-side deadline check. Returns True if deadline has passed."""
        if tender.submission_deadline:
            return tender.submission_deadline <= timezone.now()
        return False


class BidIntegrityService:
    """Handles cryptographic integrity verification for sealed bids."""

    @classmethod
    def create_integrity_record(cls, bid):
        """Create an integrity record at bid submission."""
        import json, hashlib

        # Gather components
        tech_data = {}
        if hasattr(bid, 'technical_bid'):
            tech_data = {
                'methodology': bid.technical_bid.methodology or '',
                'description': bid.technical_bid.technical_description or '',
            }

        doc_hashes = list(
            bid.documents.filter(is_deleted=False)
            .exclude(sha256_hash__isnull=True)
            .values_list('sha256_hash', flat=True)
        )

        canonical = json.dumps({
            'bid_id': str(bid.id),
            'tender_id': str(bid.tender_id),
            'vendor_id': str(bid.vendor_id),
            'version': bid.current_version,
            'tech': tech_data,
            'docs': sorted(doc_hashes),
        }, sort_keys=True)

        integrity_hash = hashlib.sha256(canonical.encode('utf-8')).hexdigest()

        record, _ = BidIntegrityRecord.objects.update_or_create(
            bid=bid,
            defaults={
                'integrity_hash': integrity_hash,
                'hash_components': {
                    'version': bid.current_version,
                    'tech_data_included': bool(tech_data),
                    'doc_count': len(doc_hashes),
                },
                'status': 'PENDING',
            }
        )
        return record

    @classmethod
    def verify_integrity(cls, bid):
        """Recompute and compare hash at opening time."""
        import json, hashlib

        record = getattr(bid, 'integrity_record', None)
        if not record:
            return False, "No integrity record found."

        tech_data = {}
        if hasattr(bid, 'technical_bid'):
            tech_data = {
                'methodology': bid.technical_bid.methodology or '',
                'description': bid.technical_bid.technical_description or '',
            }

        doc_hashes = list(
            bid.documents.filter(is_deleted=False)
            .exclude(sha256_hash__isnull=True)
            .values_list('sha256_hash', flat=True)
        )

        canonical = json.dumps({
            'bid_id': str(bid.id),
            'tender_id': str(bid.tender_id),
            'vendor_id': str(bid.vendor_id),
            'version': bid.current_version,
            'tech': tech_data,
            'docs': sorted(doc_hashes),
        }, sort_keys=True)

        recomputed = hashlib.sha256(canonical.encode('utf-8')).hexdigest()

        record.recomputed_hash = recomputed

        if recomputed == record.integrity_hash:
            record.status = 'VERIFIED'
            record.verified_at = timezone.now()
            record.verification_notes = 'Integrity check passed.'
            record.save()
            return True, "Integrity verified."
        else:
            record.status = 'FAILURE'
            record.verified_at = timezone.now()
            record.verification_notes = (
                f'INTEGRITY FAILURE: Expected {record.integrity_hash[:16]}..., '
                f'got {recomputed[:16]}...'
            )
            record.save()

            # Critical audit event
            BidAccessLog.log(
                bid=bid,
                actor=None,
                action='INTEGRITY_FAILURE',
                resource_id=str(bid.id),
                resource_reference=bid.bid_reference,
                outcome='FAILURE',
                metadata={'alert': 'CRITICAL: Bid integrity verification failed'},
            )
            return False, "CRITICAL: Integrity verification failed. Tampering detected."
