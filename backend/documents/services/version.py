from django.db import transaction
from django.utils import timezone
from documents.models import Document, DocumentVersion, DocumentAuditLog, DocumentAuditAction, ScanStatus, OCRStatus, VerificationStatus


class DocumentVersionService:
    """
    Manages immutable document versioning, sequential version numbers,
    atomic current-flag updates, and version restoration.
    """

    @classmethod
    @transaction.atomic
    def create_version(cls, document, uploaded_by, storage_key, original_filename,
                       file_size, mime_type, sha256_hash, change_summary=None,
                       scan_status=ScanStatus.PENDING_SCAN, ocr_status=OCRStatus.PENDING,
                       verification_status=VerificationStatus.UNVERIFIED):
        """
        Creates a new immutable document version and atomically updates is_current flags.
        """
        # Lock document row to prevent concurrent version creation
        doc = Document.objects.select_for_update().get(id=document.id)

        next_version_num = doc.versions.count() + 1

        # Atomically mark previous versions as non-current
        doc.versions.filter(is_current=True).update(is_current=False)

        new_version = DocumentVersion.objects.create(
            document=doc,
            version_number=next_version_num,
            uploaded_by=uploaded_by,
            storage_key=storage_key,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            sha256_hash=sha256_hash,
            change_summary=change_summary or f"Version {next_version_num} uploaded",
            is_current=True,
            scan_status=scan_status,
            ocr_status=ocr_status,
            verification_status=verification_status
        )

        doc.current_version = next_version_num
        doc.original_filename = original_filename
        doc.file_size = file_size
        doc.mime_type = mime_type
        doc.sha256_hash = sha256_hash
        doc.storage_key = storage_key
        doc.scan_status = scan_status
        doc.ocr_status = ocr_status
        doc.verification_status = verification_status
        doc.save()

        user_name = uploaded_by.full_name if uploaded_by and hasattr(uploaded_by, 'full_name') else str(uploaded_by or 'System')
        DocumentAuditLog.objects.create(
            document=doc,
            action=DocumentAuditAction.DOCUMENT_VERSION_CREATED,
            performed_by=uploaded_by if uploaded_by and getattr(uploaded_by, 'is_authenticated', False) else None,
            performed_by_name=user_name,
            details={
                'version_number': next_version_num,
                'file_size': file_size,
                'sha256_hash': sha256_hash,
                'change_summary': change_summary
            }
        )

        return new_version

    @classmethod
    @transaction.atomic
    def restore_version(cls, document, target_version_number, user=None):
        """
        Restores a previous historical version by creating a NEW version with historical content.
        Never mutates historical version records.
        """
        doc = Document.objects.select_for_update().get(id=document.id)
        target_version = doc.versions.get(version_number=target_version_number)

        next_version_num = doc.versions.count() + 1
        doc.versions.filter(is_current=True).update(is_current=False)

        restored_version = DocumentVersion.objects.create(
            document=doc,
            version_number=next_version_num,
            uploaded_by=user,
            storage_key=target_version.storage_key,
            original_filename=target_version.original_filename,
            file_size=target_version.file_size,
            mime_type=target_version.mime_type,
            sha256_hash=target_version.sha256_hash,
            change_summary=f"Restored from historical Version {target_version_number}",
            is_current=True,
            scan_status=target_version.scan_status,
            ocr_status=target_version.ocr_status,
            verification_status=target_version.verification_status
        )

        doc.current_version = next_version_num
        doc.storage_key = target_version.storage_key
        doc.original_filename = target_version.original_filename
        doc.file_size = target_version.file_size
        doc.sha256_hash = target_version.sha256_hash
        doc.save()

        user_name = user.full_name if user and hasattr(user, 'full_name') else str(user or 'System')
        DocumentAuditLog.objects.create(
            document=doc,
            action=DocumentAuditAction.DOCUMENT_RESTORED,
            performed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            performed_by_name=user_name,
            details={
                'restored_from_version': target_version_number,
                'new_version_number': next_version_num
            }
        )

        return restored_version
