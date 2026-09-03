from accounts.models import UserRole
from documents.models import Document, DocumentAuditLog, DocumentAuditAction, LifecycleStatus, ScanStatus


class DocumentAccessService:
    """
    Object-Level & Multi-Tenant Access Control Engine for Document Security.
    Enforces organization isolation, role privileges, and bid security locks.
    """

    @classmethod
    def can_view_document(cls, user, document: Document) -> bool:
        if not user or not user.is_authenticated:
            return False

        # Super admin has global oversight
        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Quarantined documents can only be viewed by Super Admin or Auditor
        if document.is_quarantined and user.role not in [UserRole.SUPER_ADMIN, UserRole.AUDITOR]:
            cls._log_access_denied(user, document, "Attempted to view quarantined file")
            return False

        # Document owner / uploader always has access to their own documents
        if document.uploaded_by_id == user.id:
            return True

        # Vendor isolation: Vendors cannot see other vendors' documents
        if user.role == UserRole.VENDOR:
            if document.owner_type in ['VENDOR', 'BID'] and document.uploaded_by_id != user.id:
                cls._log_access_denied(user, document, "Vendor isolation violation")
                return False
            # Vendor can view public tender documents
            if document.owner_type == 'TENDER':
                return True
            return False

        # Organization isolation
        if document.organization_id and user.organization_id:
            if document.organization_id != user.organization_id and user.role not in [UserRole.SUPER_ADMIN, UserRole.AUDITOR]:
                cls._log_access_denied(user, document, "Organization boundary violation")
                return False

        # Evaluator restrictions: unopened financial bids are locked
        if user.role == UserRole.EVALUATOR:
            if document.document_type and 'FINANCIAL' in document.document_type.code:
                # Financial document access check
                from tenders.models import Tender, TenderStatus
                if document.owner_type == 'TENDER' and document.owner_id:
                    try:
                        tender = Tender.objects.get(id=document.owner_id)
                        if tender.status not in [TenderStatus.EVALUATION, TenderStatus.AWARDED, TenderStatus.CLOSED]:
                            cls._log_access_denied(user, document, "Financial document locked prior to evaluation")
                            return False
                    except Exception:
                        pass

        return True

    @classmethod
    def can_download_document(cls, user, document: Document) -> bool:
        if not cls.can_view_document(user, document):
            return False

        # Never permit download of infected/quarantined documents
        if document.is_quarantined:
            return False

        # Must be uploaded and not deleted
        if not document.is_downloadable:
            return False

        return True

    @classmethod
    def can_edit_or_delete_document(cls, user, document: Document) -> bool:
        if not user or not user.is_authenticated:
            return False

        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Org Admin within same organization
        if user.role == UserRole.ORG_ADMIN and document.organization_id == user.organization_id:
            return True

        # Tender Manager for their own tenders
        if user.role == UserRole.TENDER_MANAGER and document.uploaded_by_id == user.id:
            return True

        # Vendor can update their own unsubmitted documents
        if user.role == UserRole.VENDOR and document.uploaded_by_id == user.id:
            return True

        return False

    @classmethod
    def _log_access_denied(cls, user, document, reason):
        user_name = user.full_name if hasattr(user, 'full_name') else str(user)
        DocumentAuditLog.objects.create(
            document=document,
            action=DocumentAuditAction.DOCUMENT_ACCESS_DENIED,
            performed_by=user,
            performed_by_name=user_name,
            details={'reason': reason, 'role': getattr(user, 'role', 'UNKNOWN')}
        )
