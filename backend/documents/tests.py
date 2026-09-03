import uuid
import io
import hashlib
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import User, UserRole, Organization
from documents.models import (
    Document, DocumentType, DocumentVersion, DocumentOCR,
    DocumentTemplate, DocumentAuditLog, ScanStatus, OCRStatus,
    VerificationStatus, LifecycleStatus, UploadStatus
)
from documents.services.storage import get_storage_provider, LocalStorageProvider
from documents.services.upload import DocumentUploadService
from documents.services.version import DocumentVersionService
from documents.services.scan import DocumentScanService
from documents.services.ocr import DocumentOCRService
from documents.services.verification import DocumentVerificationService
from documents.services.template import DocumentTemplateService
from documents.services.access import DocumentAccessService
from documents.seed import seed_default_document_types


class DocumentManagementEngineTestCase(TestCase):
    def setUp(self):
        seed_default_document_types()

        self.org1 = Organization.objects.create(name="Ministry of Health", code="MOH")
        self.org2 = Organization.objects.create(name="Department of Transportation", code="DOT")

        self.admin_user = User.objects.create_user(
            email="admin@tenderx.gov",
            username="super_admin",
            password="SecurePassword123!",
            role=UserRole.SUPER_ADMIN
        )

        self.procurement_officer = User.objects.create_user(
            email="officer@moh.gov",
            username="proc_officer",
            password="SecurePassword123!",
            role=UserRole.TENDER_MANAGER,
            organization=self.org1
        )

        self.vendor_a = User.objects.create_user(
            email="vendorA@supplier.com",
            username="vendor_alpha",
            password="SecurePassword123!",
            role=UserRole.VENDOR
        )

        self.vendor_b = User.objects.create_user(
            email="vendorB@supplier.com",
            username="vendor_beta",
            password="SecurePassword123!",
            role=UserRole.VENDOR
        )

        self.doc_type_spec = DocumentType.objects.get(code="TENDER_SPEC")
        self.doc_type_gst = DocumentType.objects.get(code="GST_CERT")

    def test_01_storage_provider_abstraction(self):
        storage = get_storage_provider()
        self.assertIsNotNone(storage)

        test_key = "test/documents/sample.txt"
        test_bytes = b"Hello OTMS Document Storage"

        storage.upload_bytes(test_key, test_bytes, "text/plain")
        self.assertTrue(storage.exists(test_key))

        fetched_bytes = storage.get_object_bytes(test_key)
        self.assertEqual(fetched_bytes, test_bytes)

        metadata = storage.get_metadata(test_key)
        self.assertEqual(metadata['size'], len(test_bytes))

        storage.delete(test_key)
        self.assertFalse(storage.exists(test_key))

    def test_02_document_upload_initiation_and_completion(self):
        data = {
            'title': 'Hospital Medical Equipment RFP Specification',
            'original_filename': 'rfp_specifications.pdf',
            'file_size': 1024 * 50,
            'mime_type': 'application/pdf',
            'owner_type': 'TENDER',
            'owner_id': str(uuid.uuid4()),
            'document_type': self.doc_type_spec.id
        }

        session = DocumentUploadService.initiate_upload(
            user=self.procurement_officer,
            organization=self.org1,
            data=data
        )

        self.assertIn('document_id', session)
        self.assertIn('storage_key', session)

        # Complete upload using direct file payload
        pdf_bytes = b"%PDF-1.4 sample RFP content specification for tender bidding"
        file_obj = SimpleUploadedFile("rfp_specifications.pdf", pdf_bytes, content_type="application/pdf")

        doc = DocumentUploadService.complete_upload(
            document_id=session['document_id'],
            user=self.procurement_officer,
            file_obj=file_obj
        )

        self.assertEqual(doc.upload_status, UploadStatus.UPLOADED)
        self.assertEqual(doc.current_version, 1)
        self.assertEqual(doc.file_size, len(pdf_bytes))
        self.assertEqual(doc.sha256_hash, hashlib.sha256(pdf_bytes).hexdigest())

        # Verify initial version record created
        versions = doc.versions.all()
        self.assertEqual(versions.count(), 1)
        self.assertTrue(versions.first().is_current)
        self.assertEqual(versions.first().version_number, 1)

    def test_03_versioning_and_atomic_current_flag(self):
        # Create base document
        doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.procurement_officer,
            title="Tender Specification v1",
            original_filename="specs_v1.pdf",
            storage_key="test/specs_v1.pdf",
            file_size=1000,
            sha256_hash="hash_v1",
            upload_status=UploadStatus.UPLOADED,
            current_version=1
        )
        v1 = DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            storage_key="test/specs_v1.pdf",
            original_filename="specs_v1.pdf",
            file_size=1000,
            sha256_hash="hash_v1",
            is_current=True
        )

        # Create Version 2
        v2 = DocumentVersionService.create_version(
            document=doc,
            uploaded_by=self.procurement_officer,
            storage_key="test/specs_v2.pdf",
            original_filename="specs_v2.pdf",
            file_size=1200,
            mime_type="application/pdf",
            sha256_hash="hash_v2",
            change_summary="Extended scope of work in section 4"
        )

        v1.refresh_from_db()
        doc.refresh_from_db()

        self.assertEqual(doc.current_version, 2)
        self.assertFalse(v1.is_current)
        self.assertTrue(v2.is_current)
        self.assertEqual(v2.version_number, 2)

        # Restore Version 1 -> should create Version 3 with v1 content
        v3 = DocumentVersionService.restore_version(doc, target_version_number=1, user=self.procurement_officer)
        doc.refresh_from_db()
        v2.refresh_from_db()

        self.assertEqual(doc.current_version, 3)
        self.assertFalse(v2.is_current)
        self.assertTrue(v3.is_current)
        self.assertEqual(v3.version_number, 3)
        self.assertEqual(v3.sha256_hash, "hash_v1")

    def test_04_malware_scanning_and_quarantine(self):
        storage = get_storage_provider()
        eicar_key = "test/quarantine/eicar_test.txt"
        eicar_bytes = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
        storage.upload_bytes(eicar_key, eicar_bytes, "text/plain")

        doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.procurement_officer,
            title="Suspicious Vendor Upload",
            original_filename="eicar_test.txt",
            file_extension=".txt",
            storage_key=eicar_key,
            file_size=len(eicar_bytes),
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.PENDING_SCAN,
            lifecycle_status=LifecycleStatus.SCANNING
        )
        DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            storage_key=eicar_key,
            original_filename="eicar_test.txt",
            file_size=len(eicar_bytes),
            is_current=True
        )

        result = DocumentScanService.scan_document(doc.id)
        doc.refresh_from_db()

        self.assertEqual(result['status'], 'quarantined')
        self.assertEqual(doc.scan_status, ScanStatus.INFECTED)
        self.assertEqual(doc.lifecycle_status, LifecycleStatus.QUARANTINED)
        self.assertTrue(doc.is_quarantined)
        self.assertFalse(doc.is_downloadable)

        # Verify access service blocks download
        can_download = DocumentAccessService.can_download_document(self.procurement_officer, doc)
        self.assertFalse(can_download)

    def test_05_ocr_processing_pipeline(self):
        storage = get_storage_provider()
        doc_key = "test/ocr/sample_tender_spec.txt"
        text_payload = b"ELIGIBILITY CRITERIA: Vendor must have 5 years experience in cloud IT infrastructure."
        storage.upload_bytes(doc_key, text_payload, "text/plain")

        doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.procurement_officer,
            title="Cloud Infrastructure Spec",
            original_filename="spec.txt",
            file_extension=".txt",
            storage_key=doc_key,
            file_size=len(text_payload),
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.CLEAN,
            document_type=self.doc_type_spec
        )
        DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            storage_key=doc_key,
            original_filename="spec.txt",
            file_size=len(text_payload),
            is_current=True
        )

        res = DocumentOCRService.process_ocr(doc.id)
        doc.refresh_from_db()

        self.assertEqual(res['status'], OCRStatus.COMPLETED)
        self.assertEqual(doc.ocr_status, OCRStatus.COMPLETED)
        self.assertEqual(doc.ocr_records.count(), 1)
        self.assertIn("ELIGIBILITY CRITERIA", doc.ocr_records.first().extracted_text)
        self.assertGreaterEqual(doc.ocr_records.first().confidence_score, 70.0)

    def test_06_document_verification_workflow(self):
        doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.vendor_a,
            title="Vendor GST Certificate",
            original_filename="gst.pdf",
            storage_key="test/gst.pdf",
            document_type=self.doc_type_gst,
            upload_status=UploadStatus.UPLOADED,
            verification_status=VerificationStatus.PENDING_VERIFICATION
        )
        DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            storage_key="test/gst.pdf",
            original_filename="gst.pdf",
            is_current=True
        )

        # Verify document
        verified_doc = DocumentVerificationService.verify_document(
            document_id=doc.id,
            user=self.procurement_officer,
            status_choice=VerificationStatus.VERIFIED,
            reason="Verified against Ministry of Finance database"
        )

        self.assertEqual(verified_doc.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(verified_doc.lifecycle_status, LifecycleStatus.AVAILABLE)
        self.assertEqual(verified_doc.verified_by, self.procurement_officer)

    def test_07_document_templates_and_safe_generation(self):
        template = DocumentTemplate.objects.create(
            name="Tender Award Letter Template",
            code="AWARD_LETTER_TMPL",
            organization=self.org1,
            template_content="Dear {{vendor.name}}, congratulations! You have been awarded contract for {{tender.title}} at USD {{contract.amount}}.",
            created_by=self.procurement_officer
        )

        context = {
            'vendor': {'name': 'Acme Global Ltd'},
            'tender': {'title': 'High-Speed Rail Construction'},
            'contract': {'amount': '12500000.00'}
        }

        generated_doc = DocumentTemplateService.generate_document_from_template(
            template_id=template.id,
            context_data=context,
            user=self.procurement_officer,
            owner_type='TENDER',
            owner_id=str(uuid.uuid4())
        )

        self.assertEqual(generated_doc.upload_status, UploadStatus.UPLOADED)
        self.assertEqual(generated_doc.verification_status, VerificationStatus.VERIFIED)

        # Verify rendered content
        storage = get_storage_provider()
        content = storage.get_object_bytes(generated_doc.storage_key).decode('utf-8')
        self.assertIn("Acme Global Ltd", content)
        self.assertIn("High-Speed Rail Construction", content)
        self.assertIn("USD 12500000.00", content)

    def test_08_organization_isolation_and_security_access(self):
        # Doc belonging to Org 1 (MOH)
        moh_doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.procurement_officer,
            title="Confidential Internal MOH Budget",
            original_filename="budget.pdf",
            storage_key="test/budget.pdf",
            owner_type="ORGANIZATION",
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.CLEAN
        )

        # Vendor A document
        vendor_a_doc = Document.objects.create(
            uploaded_by=self.vendor_a,
            title="Vendor A Private Financial Balance Sheet",
            original_filename="balance_sheet.pdf",
            storage_key="test/balance_sheet.pdf",
            owner_type="VENDOR",
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.CLEAN
        )

        # Super admin can view all
        self.assertTrue(DocumentAccessService.can_view_document(self.admin_user, moh_doc))
        self.assertTrue(DocumentAccessService.can_view_document(self.admin_user, vendor_a_doc))

        # Vendor A can view their own
        self.assertTrue(DocumentAccessService.can_view_document(self.vendor_a, vendor_a_doc))

        # Vendor B CANNOT view Vendor A's private document
        self.assertFalse(DocumentAccessService.can_view_document(self.vendor_b, vendor_a_doc))

        # Vendor A cannot view MOH internal organization document
        self.assertFalse(DocumentAccessService.can_view_document(self.vendor_a, moh_doc))

    def test_09_document_expiry_tracking(self):
        # Create doc expiring in 5 days
        doc = Document.objects.create(
            organization=self.org1,
            uploaded_by=self.procurement_officer,
            title="Expiring Contractor License",
            original_filename="license.pdf",
            storage_key="test/license.pdf",
            expires_at=timezone.now() + timedelta(days=5),
            upload_status=UploadStatus.UPLOADED,
            scan_status=ScanStatus.CLEAN
        )

        self.assertIsNotNone(doc.days_until_expiry)
        self.assertLessEqual(doc.days_until_expiry, 5)
