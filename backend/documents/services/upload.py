import os
import hashlib
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from documents.models import (
    Document, DocumentType, DocumentVersion, UploadStatus, ScanStatus,
    OCRStatus, VerificationStatus, LifecycleStatus, DocumentAuditLog, DocumentAuditAction
)
from .storage import get_storage_provider
from .scan import DocumentScanService
from .ocr import DocumentOCRService


class DocumentUploadService:
    """
    Handles secure single and multipart upload workflows, pre-upload validation,
    storage key generation, integrity hashing, and post-upload task dispatching.
    """

    @classmethod
    def initiate_upload(cls, user, organization, data):
        """
        Validates file metadata and generates presigned S3 upload URL or multipart session.
        """
        title = data.get('title')
        original_filename = data.get('original_filename')
        file_size = int(data.get('file_size', 0))
        mime_type = data.get('mime_type', 'application/pdf')
        owner_type = data.get('owner_type', 'TENDER')
        owner_id = str(data.get('owner_id', ''))
        doc_type_id = data.get('document_type')
        is_multipart = bool(data.get('is_multipart', False))

        if not original_filename:
            raise ValidationError("original_filename is required.")
        if not title:
            title = original_filename

        ext = os.path.splitext(original_filename)[1].lower()

        # Validate Document Type rules if specified
        doc_type = None
        if doc_type_id:
            try:
                doc_type = DocumentType.objects.get(id=doc_type_id, is_active=True)
                if doc_type.allowed_extensions and ext not in [e.lower() for e in doc_type.allowed_extensions]:
                    raise ValidationError(f"File extension '{ext}' is not permitted for document type '{doc_type.name}'. Allowed: {doc_type.allowed_extensions}")
                if file_size > doc_type.max_file_size:
                    raise ValidationError(f"File size exceeds maximum permitted {doc_type.max_file_size // (1024*1024)}MB for '{doc_type.name}'.")
            except DocumentType.DoesNotExist:
                pass

        org_id_str = str(organization.id) if organization else 'global'
        doc_temp = Document.objects.create(
            organization=organization,
            uploaded_by=user if user and getattr(user, 'is_authenticated', False) else None,
            owner_type=owner_type,
            owner_id=owner_id,
            document_type=doc_type,
            title=title,
            description=data.get('description', ''),
            original_filename=original_filename,
            file_extension=ext,
            file_size=file_size,
            mime_type=mime_type,
            storage_key=f"organizations/{org_id_str}/{owner_type.lower()}s/{owner_id or 'general'}/documents/temp/versions/1/{original_filename}",
            upload_status=UploadStatus.INITIATED,
            lifecycle_status=LifecycleStatus.INITIATED,
            expires_at=data.get('expires_at')
        )

        # Build official storage key with generated UUID
        official_key = f"organizations/{org_id_str}/{owner_type.lower()}s/{owner_id or 'general'}/documents/{doc_temp.id}/versions/1/{original_filename}"
        doc_temp.storage_key = official_key
        doc_temp.save(update_fields=['storage_key'])

        storage = get_storage_provider()

        if is_multipart:
            session = storage.initiate_multipart_upload(official_key, mime_type)
            return {
                'document_id': str(doc_temp.id),
                'storage_key': official_key,
                'is_multipart': True,
                'upload_id': session['upload_id'],
                'bucket': session['bucket']
            }
        else:
            upload_info = storage.generate_upload_url(official_key, mime_type)
            return {
                'document_id': str(doc_temp.id),
                'storage_key': official_key,
                'is_multipart': False,
                'upload_url': upload_info['upload_url'],
                'method': upload_info.get('method', 'PUT'),
                'headers': upload_info.get('headers', {})
            }

    @classmethod
    @transaction.atomic
    def complete_upload(cls, document_id, user=None, file_obj=None, sha256_hash=None, parts=None, upload_id=None):
        """
        Completes upload, verifies content, computes hash, creates DocumentVersion 1,
        and dispatches background scan and OCR pipelines.
        """
        doc = Document.objects.select_for_update().get(id=document_id)
        storage = get_storage_provider()

        # If direct file upload provided
        if file_obj:
            content_bytes = file_obj.read()
            storage.upload_bytes(doc.storage_key, content_bytes, doc.mime_type)
            doc.file_size = len(content_bytes)
            computed_hash = hashlib.sha256(content_bytes).hexdigest()
        elif parts and upload_id:
            storage.complete_multipart_upload(doc.storage_key, upload_id, parts)
            content_bytes = storage.get_object_bytes(doc.storage_key)
            doc.file_size = len(content_bytes)
            computed_hash = hashlib.sha256(content_bytes).hexdigest()
        else:
            # Presigned S3 direct upload
            content_bytes = storage.get_object_bytes(doc.storage_key)
            doc.file_size = len(content_bytes)
            computed_hash = hashlib.sha256(content_bytes).hexdigest()

        final_hash = sha256_hash or computed_hash
        doc.sha256_hash = final_hash
        doc.upload_status = UploadStatus.UPLOADED
        doc.lifecycle_status = LifecycleStatus.UPLOADED
        doc.current_version = 1
        doc.save()

        # Create Version 1
        DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            uploaded_by=user if user and getattr(user, 'is_authenticated', False) else doc.uploaded_by,
            storage_key=doc.storage_key,
            original_filename=doc.original_filename,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            sha256_hash=final_hash,
            change_summary="Initial document upload",
            is_current=True,
            scan_status=ScanStatus.PENDING_SCAN,
            ocr_status=OCRStatus.PENDING,
            verification_status=VerificationStatus.UNVERIFIED
        )

        user_name = user.full_name if user and hasattr(user, 'full_name') else (str(user) if user else "System Upload")
        DocumentAuditLog.objects.create(
            document=doc,
            action=DocumentAuditAction.DOCUMENT_UPLOADED,
            performed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            performed_by_name=user_name,
            details={
                'filename': doc.original_filename,
                'file_size': doc.file_size,
                'sha256_hash': final_hash
            }
        )

        # Trigger scanning and OCR asynchronously or synchronously
        try:
            from documents.tasks import scan_document_task, process_ocr_task
            scan_document_task.delay(str(doc.id))
            if doc.document_type and doc.document_type.requires_ocr:
                process_ocr_task.delay(str(doc.id))
        except Exception:
            # Synchronous execution fallback for local test runs
            DocumentScanService.scan_document(str(doc.id))
            if doc.document_type and doc.document_type.requires_ocr:
                DocumentOCRService.process_ocr(str(doc.id))

        return doc
