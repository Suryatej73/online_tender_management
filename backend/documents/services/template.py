import re
import hashlib
from django.utils import timezone
from documents.models import (
    Document, DocumentTemplate, DocumentVersion, UploadStatus,
    ScanStatus, OCRStatus, VerificationStatus, LifecycleStatus,
    DocumentAuditLog, DocumentAuditAction
)
from .storage import get_storage_provider


class DocumentTemplateService:
    """
    Safe template processing and automated procurement document generation.
    Never executes arbitrary code; performs strict regex/token substitution.
    """

    VARIABLE_PATTERN = re.compile(r'\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}')

    @classmethod
    def extract_variables(cls, template_text):
        return sorted(list(set(cls.VARIABLE_PATTERN.findall(template_text))))

    @classmethod
    def render_content(cls, template_text, context_data):
        def replacer(match):
            key = match.group(1).strip()
            # Support nested lookup e.g. tender.title or flat lookup
            parts = key.split('.')
            val = context_data
            for p in parts:
                if isinstance(val, dict):
                    val = val.get(p, '')
                elif hasattr(val, p):
                    val = getattr(val, p, '')
                else:
                    val = ''
            return str(val) if val is not None else ''

        return cls.VARIABLE_PATTERN.sub(replacer, template_text)

    @classmethod
    def generate_document_from_template(cls, template_id, context_data, user=None, title=None, owner_type='TENDER', owner_id=None):
        template = DocumentTemplate.objects.get(id=template_id)

        rendered_text = cls.render_content(template.template_content, context_data)
        content_bytes = rendered_text.encode('utf-8')
        file_size = len(content_bytes)
        sha256_hash = hashlib.sha256(content_bytes).hexdigest()

        doc_title = title or f"Generated - {template.name} ({timezone.now().strftime('%Y%m%d-%H%M')})"
        filename = f"{template.code.lower()}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.txt"

        org = template.organization
        if not org and user and hasattr(user, 'organization'):
            org = user.organization

        org_id_str = str(org.id) if org else 'global'
        storage_key = f"organizations/{org_id_str}/{owner_type.lower()}s/{owner_id or 'general'}/documents/generated/{filename}"

        storage = get_storage_provider()
        storage.upload_bytes(storage_key, content_bytes, 'text/plain')

        doc = Document.objects.create(
            organization=org,
            uploaded_by=user if user and getattr(user, 'is_authenticated', False) else None,
            owner_type=owner_type,
            owner_id=owner_id,
            document_type=template.document_type,
            title=doc_title,
            description=f"Generated automatically from template: {template.name} (v{template.version})",
            original_filename=filename,
            storage_key=storage_key,
            mime_type='text/plain',
            file_extension='.txt',
            file_size=file_size,
            sha256_hash=sha256_hash,
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.CLEAN,
            ocr_status=OCRStatus.COMPLETED,
            verification_status=VerificationStatus.VERIFIED,
            lifecycle_status=LifecycleStatus.AVAILABLE,
            current_version=1
        )

        DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            uploaded_by=user if user and getattr(user, 'is_authenticated', False) else None,
            storage_key=storage_key,
            original_filename=filename,
            file_size=file_size,
            mime_type='text/plain',
            sha256_hash=sha256_hash,
            change_summary=f"Generated from template {template.name}",
            is_current=True,
            scan_status=ScanStatus.CLEAN,
            ocr_status=OCRStatus.COMPLETED,
            verification_status=VerificationStatus.VERIFIED
        )

        user_name = user.full_name if user and hasattr(user, 'full_name') else str(user or 'Template Engine')
        DocumentAuditLog.objects.create(
            document=doc,
            action=DocumentAuditAction.DOCUMENT_GENERATED,
            performed_by=user if user and getattr(user, 'is_authenticated', False) else None,
            performed_by_name=user_name,
            details={
                'template_id': str(template.id),
                'template_name': template.name,
                'sha256_hash': sha256_hash
            }
        )

        return doc
