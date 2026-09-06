import hashlib
from django.utils import timezone
from documents.models import Document, ScanStatus, LifecycleStatus, DocumentAuditLog, DocumentAuditAction
from .storage import get_storage_provider


class DocumentScanService:
    """
    Antivirus & Malware Scanning Pipeline.
    Quarantines suspicious objects, prevents download, and logs security alerts.
    """

    # EICAR standard test signature and dangerous executable byte headers
    DANGEROUS_SIGNATURES = [
        b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        b'\x4D\x5A\x90\x00',  # Windows PE executable header
        b'\x7F\x45\x4C\x46',  # ELF binary executable header
    ]

    @classmethod
    def scan_document(cls, document_id):
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return {'status': 'error', 'message': 'Document not found'}

        document.scan_status = ScanStatus.PENDING_SCAN
        document.lifecycle_status = LifecycleStatus.SCANNING
        document.save(update_fields=['scan_status', 'lifecycle_status', 'updated_at'])

        storage = get_storage_provider()
        try:
            content_bytes = storage.get_object_bytes(document.storage_key)
        except Exception as e:
            err_str = str(e).lower()
            if 'invalid argument' in err_str or 'permission' in err_str or 'access' in err_str or 'virus' in err_str or '[errno 22]' in err_str:
                document.scan_status = ScanStatus.INFECTED
                document.lifecycle_status = LifecycleStatus.QUARANTINED
                document.save(update_fields=['scan_status', 'lifecycle_status', 'updated_at'])
                document.versions.filter(is_current=True).update(scan_status=ScanStatus.INFECTED)
                return {'status': 'quarantined', 'threat': 'Blocked by System Antivirus Engine (OS Security)'}

            document.scan_status = ScanStatus.SCAN_FAILED
            document.save(update_fields=['scan_status', 'updated_at'])
            return {'status': 'failed', 'error': str(e)}

        # Check for dangerous payload signatures
        is_infected = False
        detected_threat = None

        for sig in cls.DANGEROUS_SIGNATURES:
            if sig in content_bytes:
                # If it's an executable header but document claims to be PDF or image
                if sig in (b'\x4D\x5A\x90\x00', b'\x7F\x45\x4C\x46'):
                    if document.file_extension.lower() in ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx']:
                        is_infected = True
                        detected_threat = "Disguised Executable Binary Payload"
                        break
                else:
                    is_infected = True
                    detected_threat = "Malware Signature Detected (EICAR Test Suite)"
                    break

        if is_infected:
            document.scan_status = ScanStatus.INFECTED
            document.lifecycle_status = LifecycleStatus.QUARANTINED
            document.save(update_fields=['scan_status', 'lifecycle_status', 'updated_at'])

            # Also update current version
            document.versions.filter(is_current=True).update(scan_status=ScanStatus.INFECTED)

            DocumentAuditLog.objects.create(
                document=document,
                action=DocumentAuditAction.DOCUMENT_QUARANTINED,
                performed_by=None,
                performed_by_name="System Antivirus Scanner",
                details={'threat_type': detected_threat, 'quarantined_at': timezone.now().isoformat()}
            )
            return {'status': 'quarantined', 'threat': detected_threat}

        # Clean document
        document.scan_status = ScanStatus.CLEAN
        if document.document_type and document.document_type.requires_ocr:
            document.lifecycle_status = LifecycleStatus.OCR_PROCESSING
        elif document.document_type and document.document_type.requires_verification:
            document.lifecycle_status = LifecycleStatus.VERIFICATION
        else:
            document.lifecycle_status = LifecycleStatus.AVAILABLE

        document.save(update_fields=['scan_status', 'lifecycle_status', 'updated_at'])
        document.versions.filter(is_current=True).update(scan_status=ScanStatus.CLEAN)

        return {'status': 'clean'}
