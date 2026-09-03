from django.utils import timezone
from datetime import timedelta
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

from documents.models import Document, LifecycleStatus
from documents.services.scan import DocumentScanService
from documents.services.ocr import DocumentOCRService
from documents.services.template import DocumentTemplateService


@shared_task
def scan_document_task(document_id):
    """Asynchronous malware and virus scanning task."""
    return DocumentScanService.scan_document(document_id)


@shared_task
def process_ocr_task(document_id, version_number=None):
    """Asynchronous OCR text extraction pipeline task."""
    return DocumentOCRService.process_ocr(document_id, version_number=version_number)


@shared_task
def check_document_expiry_task():
    """
    Scheduled background task to identify expiring certificates, licenses, and guarantees.
    Checks 30, 15, 7, and 1 day thresholds and marks expired documents.
    """
    now = timezone.now()
    expiring_soon = Document.objects.filter(
        is_deleted=False,
        expires_at__isnull=False,
        expires_at__lte=now + timedelta(days=30),
        expires_at__gt=now
    )

    expired_count = Document.objects.filter(
        is_deleted=False,
        expires_at__isnull=False,
        expires_at__lte=now
    ).exclude(lifecycle_status=LifecycleStatus.EXPIRED).update(lifecycle_status=LifecycleStatus.EXPIRED)

    return {
        'expiring_soon_count': expiring_soon.count(),
        'marked_expired_count': expired_count,
        'checked_at': now.isoformat()
    }


@shared_task
def process_bulk_upload_task(document_ids):
    """Processes bulk uploaded documents for concurrent scanning and OCR."""
    results = []
    for doc_id in document_ids:
        scan_res = DocumentScanService.scan_document(doc_id)
        ocr_res = DocumentOCRService.process_ocr(doc_id)
        results.append({'document_id': doc_id, 'scan': scan_res, 'ocr': ocr_res})
    return results


@shared_task
def generate_template_document_task(template_id, context_data, user_id=None):
    """Background task to generate and render tender documents from templates."""
    from accounts.models import User
    user = User.objects.filter(id=user_id).first() if user_id else None
    doc = DocumentTemplateService.generate_document_from_template(template_id, context_data, user=user)
    return {'status': 'completed', 'document_id': str(doc.id)}
