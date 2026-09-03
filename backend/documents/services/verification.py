from django.utils import timezone
from documents.models import Document, VerificationStatus, LifecycleStatus, DocumentAuditLog, DocumentAuditAction


class DocumentVerificationService:
    """
    Manages official procurement document verification workflows and compliance review.
    """

    @classmethod
    def verify_document(cls, document_id, user, status_choice, reason=None):
        doc = Document.objects.get(id=document_id)

        if status_choice not in [VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationStatus.REVIEW_REQUIRED]:
            raise ValueError(f"Invalid verification status: {status_choice}")

        doc.verification_status = status_choice
        doc.verified_by = user if user and getattr(user, 'is_authenticated', False) else None
        doc.verified_at = timezone.now()
        doc.verification_reason = reason or ''

        if status_choice == VerificationStatus.VERIFIED:
            doc.lifecycle_status = LifecycleStatus.AVAILABLE
            action = DocumentAuditAction.DOCUMENT_VERIFIED
        elif status_choice == VerificationStatus.REJECTED:
            doc.lifecycle_status = LifecycleStatus.REJECTED
            action = DocumentAuditAction.DOCUMENT_REJECTED
        else:
            action = DocumentAuditAction.DOCUMENT_VERIFIED

        doc.save()
        doc.versions.filter(is_current=True).update(verification_status=status_choice)

        user_name = user.full_name if user and hasattr(user, 'full_name') else str(user or 'Compliance Officer')
        DocumentAuditLog.objects.create(
            document=doc,
            action=action,
            performed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            performed_by_name=user_name,
            details={'status': status_choice, 'reason': reason, 'verified_at': doc.verified_at.isoformat()}
        )

        return doc
