from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Avg, Count, F

from .models import (
    Vendor, VendorStatus, VendorStatusHistory, VendorAuditLog,
    VendorBlacklist, VendorSuspension, VendorRating,
    VendorPerformanceRecord, AuditAction, BlacklistStatus,
)


class VendorStatusService:
    """
    Centralized state management for vendor lifecycle.
    Enforces business rules and records all state changes.
    """

    VALID_TRANSITIONS = {
        VendorStatus.PENDING_VERIFICATION: [VendorStatus.VERIFIED, VendorStatus.REJECTED],
        VendorStatus.VERIFIED: [VendorStatus.SUSPENDED, VendorStatus.BLACKLISTED, VendorStatus.DEACTIVATED],
        VendorStatus.REJECTED: [VendorStatus.PENDING_VERIFICATION],
        VendorStatus.SUSPENDED: [VendorStatus.VERIFIED, VendorStatus.BLACKLISTED, VendorStatus.DEACTIVATED],
        VendorStatus.BLACKLISTED: [],  # Terminal - only via appeal
        VendorStatus.DEACTIVATED: [VendorStatus.PENDING_VERIFICATION],
    }

    @classmethod
    def is_valid_transition(cls, current_status, target_status):
        allowed = cls.VALID_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @classmethod
    @transaction.atomic
    def transition_vendor(cls, vendor, target_status, user=None, reason=""):
        current_status = vendor.status

        if current_status == target_status:
            return vendor

        if not cls.is_valid_transition(current_status, target_status):
            raise ValueError(
                f"Invalid vendor status transition from '{current_status}' to '{target_status}'. "
                f"Allowed: {cls.VALID_TRANSITIONS.get(current_status, ['None'])}"
            )

        vendor.status = target_status

        if target_status == VendorStatus.VERIFIED:
            vendor.verified_at = timezone.now()
        vendor.save()

        # Record history
        user_name = user.full_name if user and hasattr(user, 'full_name') else (str(user) if user else "System")
        VendorStatusHistory.objects.create(
            vendor=vendor,
            from_status=current_status,
            to_status=target_status,
            changed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            changed_by_name=user_name,
            reason=reason or f"Status changed from {current_status} to {target_status}"
        )

        return vendor

    @classmethod
    @transaction.atomic
    def verify_vendor(cls, vendor, user=None, reason=""):
        return cls.transition_vendor(vendor, VendorStatus.VERIFIED, user=user, reason=reason)

    @classmethod
    @transaction.atomic
    def reject_vendor(cls, vendor, user=None, reason=""):
        return cls.transition_vendor(vendor, VendorStatus.REJECTED, user=user, reason=reason)

    @classmethod
    @transaction.atomic
    def suspend_vendor(cls, vendor, user=None, reason="", end_date=None, remarks=""):
        vendor = cls.transition_vendor(vendor, VendorStatus.SUSPENDED, user=user, reason=reason)
        VendorSuspension.objects.create(
            vendor=vendor,
            reason=reason,
            remarks=remarks,
            end_date=end_date,
            created_by=user if user and getattr(user, 'is_authenticated', False) else None,
        )
        return vendor

    @classmethod
    @transaction.atomic
    def blacklist_vendor(cls, vendor, user=None, reason="", description="",
                         end_date=None, is_permanent=False, evidence_file=None):
        vendor = cls.transition_vendor(vendor, VendorStatus.BLACKLISTED, user=user, reason=reason)
        VendorBlacklist.objects.create(
            vendor=vendor,
            reason=reason,
            description=description,
            end_date=end_date,
            is_permanent=is_permanent,
            evidence_file=evidence_file,
            created_by=user if user and getattr(user, 'is_authenticated', False) else None,
            created_by_name=user.full_name if user and hasattr(user, 'full_name') else str(user),
        )
        return vendor

    @classmethod
    @transaction.atomic
    def reinstate_vendor(cls, vendor, user=None, reason=""):
        return cls.transition_vendor(vendor, VendorStatus.VERIFIED, user=user, reason=reason)

    @classmethod
    def check_eligibility(cls, vendor):
        """Check if vendor is eligible for tender participation."""
        if vendor.status == VendorStatus.VERIFIED:
            # Check documents are valid
            mandatory_docs = vendor.documents.filter(
                document_type__in=[
                    'COMPANY_REGISTRATION', 'TAX_CERTIFICATE', 'BUSINESS_LICENSE'
                ]
            )
            for doc in mandatory_docs:
                if doc.is_expired or doc.status == 'REJECTED':
                    return False, f"Mandatory document '{doc.get_document_type_display()}' is {'expired' if doc.is_expired else 'rejected'}"
            return True, "Eligible"
        return False, f"Vendor status is '{vendor.status}'"


class VendorPerformanceService:
    """
    Calculates and caches vendor performance scores from actual tender/project data.
    """

    WEIGHTS = {
        'quality': 0.30,
        'timeliness': 0.20,
        'technical': 0.20,
        'communication': 0.10,
        'compliance': 0.10,
        'overall_rating': 0.10,
    }

    @classmethod
    def calculate_performance_score(cls, vendor):
        """Calculate weighted performance score from performance records."""
        records = VendorPerformanceRecord.objects.filter(vendor=vendor)
        if not records.exists():
            return 0.0

        scores = records.aggregate(
            avg_quality=Avg('quality_score'),
            avg_timeliness=Avg('timeliness_score'),
            avg_technical=Avg('technical_score'),
            avg_communication=Avg('communication_score'),
            avg_compliance=Avg('compliance_score'),
            avg_overall=Avg('overall_rating'),
        )

        score = (
            float(scores['avg_quality'] or 0) * cls.WEIGHTS['quality'] +
            float(scores['avg_timeliness'] or 0) * cls.WEIGHTS['timeliness'] +
            float(scores['avg_technical'] or 0) * cls.WEIGHTS['technical'] +
            float(scores['avg_communication'] or 0) * cls.WEIGHTS['communication'] +
            float(scores['avg_compliance'] or 0) * cls.WEIGHTS['compliance'] +
            float(scores['avg_overall'] or 0) * cls.WEIGHTS['overall_rating']
        )

        return round(score, 2)

    @classmethod
    def update_vendor_aggregates(cls, vendor):
        """Recalculate and cache vendor aggregate ratings and performance."""
        # Performance score
        vendor.performance_score = cls.calculate_performance_score(vendor)

        # Project counts
        from tenders.models import Tender, TenderStatus
        vendor.completed_projects = VendorPerformanceRecord.objects.filter(
            vendor=vendor, is_completed=True
        ).count()
        vendor.active_projects = VendorPerformanceRecord.objects.filter(
            vendor=vendor, is_completed=False
        ).count()

        # Rating aggregates
        ratings_agg = VendorRating.objects.filter(vendor=vendor).aggregate(
            avg_overall=Avg('overall_performance'),
            avg_quality=Avg('quality_of_work'),
            avg_technical=Avg('technical_capability'),
            avg_timeliness=Avg('timeliness'),
            avg_communication=Avg('communication'),
            avg_compliance=Avg('compliance'),
            count=Count('id'),
        )
        vendor.overall_rating = round(float(ratings_agg['avg_overall'] or 0), 2)
        vendor.quality_rating = round(float(ratings_agg['avg_quality'] or 0), 2)
        vendor.technical_rating = round(float(ratings_agg['avg_technical'] or 0), 2)
        vendor.timeliness_rating = round(float(ratings_agg['avg_timeliness'] or 0), 2)
        vendor.communication_rating = round(float(ratings_agg['avg_communication'] or 0), 2)
        vendor.compliance_rating = round(float(ratings_agg['avg_compliance'] or 0), 2)
        vendor.rating_count = ratings_agg['count']

        # On-time percentage
        completed = VendorPerformanceRecord.objects.filter(vendor=vendor, is_completed=True)
        if completed.exists():
            on_time = completed.filter(
                actual_completion__lte=F('expected_completion')
            ).count()
            vendor.on_time_percentage = round((on_time / completed.count()) * 100, 2)
        else:
            vendor.on_time_percentage = 0

        vendor.save()
        return vendor


class VendorDocumentService:
    """Manages vendor document lifecycle including expiry checks."""

    @classmethod
    def check_expiring_documents(cls, days=30):
        """Find documents expiring within the given number of days."""
        from django.utils import timezone as tz
        from datetime import timedelta
        future_date = tz.now().date() + timedelta(days=days)
        return VendorDocument.objects.filter(
            expiry_date__lte=future_date,
            expiry_date__gte=tz.now().date(),
            status='VERIFIED',
        )

    @classmethod
    def update_expired_documents(cls):
        """Mark documents past their expiry date as EXPIRED."""
        from django.utils import timezone as tz
        expired = VendorDocument.objects.filter(
            expiry_date__lt=tz.now().date(),
            status='VERIFIED',
        )
        count = expired.update(status='EXPIRED')
        return count


def create_audit_log(vendor=None, user=None, action="", description="", request=None):
    """Create an audit log entry."""
    ip = None
    user_agent = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        user_agent = request.META.get('HTTP_USER_AGENT', 'Browser')

    user_name = None
    if user and hasattr(user, 'full_name'):
        user_name = user.full_name

    VendorAuditLog.objects.create(
        vendor=vendor,
        user=user,
        user_name=user_name,
        action=action,
        description=description,
        ip_address=ip,
        user_agent=user_agent,
    )
