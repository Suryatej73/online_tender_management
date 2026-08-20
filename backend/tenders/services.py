from django.utils import timezone
from django.db import transaction
from .models import TenderStatus, TenderStatusHistory, TenderVersion


class TenderLifecycleService:
    """
    Centralized State Machine Engine for Tender Lifecycle Transitions.
    Enforces strict business rules and records all state changes.
    """

    ALLOWED_TRANSITIONS = {
        TenderStatus.DRAFT: [TenderStatus.PUBLISHED, TenderStatus.CANCELLED],
        TenderStatus.PUBLISHED: [TenderStatus.ACTIVE, TenderStatus.CANCELLED],
        TenderStatus.ACTIVE: [TenderStatus.EVALUATION, TenderStatus.CANCELLED],
        TenderStatus.EVALUATION: [TenderStatus.AWARDED, TenderStatus.CANCELLED],
        TenderStatus.AWARDED: [TenderStatus.CLOSED],
        TenderStatus.CLOSED: [],
        TenderStatus.CANCELLED: [],
    }

    @classmethod
    def is_valid_transition(cls, current_status, target_status):
        if current_status == target_status:
            return True
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @classmethod
    def validate_publishing_readiness(cls, tender):
        errors = []
        if not tender.title or len(tender.title.strip()) < 5:
            errors.append("Tender title must be at least 5 characters long.")
        if not tender.description or len(tender.description.strip()) < 10:
            errors.append("Detailed tender description is required before publishing.")
        if not tender.category:
            errors.append("Tender must be assigned to a valid Tender Category.")
        if not tender.submission_deadline:
            errors.append("Submission deadline is mandatory before publishing.")
        elif tender.submission_deadline <= timezone.now():
            errors.append("Submission deadline must be in the future.")
        if tender.opening_date and tender.submission_deadline and tender.opening_date < tender.submission_deadline:
            errors.append("Bid opening date must be on or after the submission deadline.")
        if tender.budget is None or tender.budget <= 0:
            errors.append("Tender budget must be a positive number greater than zero.")

        if errors:
            raise ValueError(f"Tender publishing validation failed: {'; '.join(errors)}")

    @classmethod
    @transaction.atomic
    def transition_tender(cls, tender, target_status, user=None, reason=""):
        current_status = tender.status

        if current_status == target_status:
            return tender

        if not cls.is_valid_transition(current_status, target_status):
            raise ValueError(
                f"Invalid lifecycle transition from '{current_status}' to '{target_status}'. "
                f"Allowed target states: {cls.ALLOWED_TRANSITIONS.get(current_status, ['None'])}"
            )

        now = timezone.now()

        if target_status == TenderStatus.PUBLISHED:
            cls.validate_publishing_readiness(tender)
            if not tender.publication_date:
                tender.publication_date = now

        elif target_status == TenderStatus.ACTIVE:
            if not tender.start_date:
                tender.start_date = now

        elif target_status == TenderStatus.EVALUATION:
            if not tender.evaluation_start_date:
                tender.evaluation_start_date = now

        elif target_status == TenderStatus.AWARDED:
            if not tender.award_date:
                tender.award_date = now

        elif target_status == TenderStatus.CLOSED:
            if not tender.closed_date:
                tender.closed_date = now

        tender.status = target_status
        tender.save()

        # Record Status History
        user_name = user.full_name if user and hasattr(user, 'full_name') else (str(user) if user else "System Automated")
        TenderStatusHistory.objects.create(
            tender=tender,
            from_status=current_status,
            to_status=target_status,
            changed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            changed_by_name=user_name,
            reason=reason or f"Transitioned from {current_status} to {target_status}"
        )

        # Record Initial Snapshot on Publish
        if target_status == TenderStatus.PUBLISHED and not TenderVersion.objects.filter(tender=tender, version_number=1).exists():
            from .serializers import TenderSerializer
            try:
                snapshot_data = TenderSerializer(tender).data
            except Exception:
                snapshot_data = {
                    "tender_number": tender.tender_number,
                    "title": tender.title,
                    "budget": str(tender.budget),
                    "status": tender.status
                }
            TenderVersion.objects.create(
                tender=tender,
                version_number=1,
                snapshot=snapshot_data,
                changed_by=user if user and getattr(user, 'is_authenticated', False) else None,
                change_type="PUBLISHED"
            )

        return tender
