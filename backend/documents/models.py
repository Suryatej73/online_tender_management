import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class OwnerType(models.TextChoices):
    TENDER = 'TENDER', _('Tender')
    VENDOR = 'VENDOR', _('Vendor')
    BID = 'BID', _('Bid')
    EVALUATION = 'EVALUATION', _('Evaluation')
    AWARD = 'AWARD', _('Award')
    CONTRACT = 'CONTRACT', _('Contract')
    ORGANIZATION = 'ORGANIZATION', _('Organization')
    OTHER = 'OTHER', _('Other')


class UploadStatus(models.TextChoices):
    INITIATED = 'INITIATED', _('Initiated')
    UPLOADING = 'UPLOADING', _('Uploading')
    UPLOADED = 'UPLOADED', _('Uploaded')
    FAILED = 'FAILED', _('Failed')


class ScanStatus(models.TextChoices):
    PENDING_SCAN = 'PENDING_SCAN', _('Pending Scan')
    CLEAN = 'CLEAN', _('Clean / No Threats Detected')
    INFECTED = 'INFECTED', _('Infected / Malicious')
    QUARANTINED = 'QUARANTINED', _('Quarantined')
    SCAN_FAILED = 'SCAN_FAILED', _('Scan Failed')


class OCRStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending OCR')
    PROCESSING = 'PROCESSING', _('Processing')
    COMPLETED = 'COMPLETED', _('Completed')
    FAILED = 'FAILED', _('Failed')
    REVIEW_REQUIRED = 'REVIEW_REQUIRED', _('Review Required (Low Confidence)')
    SKIPPED = 'SKIPPED', _('Skipped')


class VerificationStatus(models.TextChoices):
    UNVERIFIED = 'UNVERIFIED', _('Unverified')
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', _('Pending Verification')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')
    REVIEW_REQUIRED = 'REVIEW_REQUIRED', _('Review Required')


class LifecycleStatus(models.TextChoices):
    INITIATED = 'INITIATED', _('Initiated')
    UPLOADING = 'UPLOADING', _('Uploading')
    UPLOADED = 'UPLOADED', _('Uploaded')
    SCANNING = 'SCANNING', _('Scanning')
    OCR_PROCESSING = 'OCR_PROCESSING', _('OCR Processing')
    VERIFICATION = 'VERIFICATION', _('Pending Verification')
    AVAILABLE = 'AVAILABLE', _('Available / Ready')
    REJECTED = 'REJECTED', _('Rejected')
    QUARANTINED = 'QUARANTINED', _('Quarantined')
    FAILED = 'FAILED', _('Failed')
    EXPIRED = 'EXPIRED', _('Expired')
    ARCHIVED = 'ARCHIVED', _('Archived')
    DELETED = 'DELETED', _('Deleted')


class OCRProvider(models.TextChoices):
    TESSERACT = 'TESSERACT', _('Tesseract OCR')
    TEXTRACT = 'TEXTRACT', _('AWS Textract')
    MOCK = 'MOCK', _('Enterprise Mock Provider')


class DocumentAuditAction(models.TextChoices):
    DOCUMENT_CREATED = 'DOCUMENT_CREATED', _('Document Created')
    DOCUMENT_VIEWED = 'DOCUMENT_VIEWED', _('Document Viewed')
    DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED', _('Document Downloaded')
    DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED', _('Document Uploaded')
    DOCUMENT_VERSION_CREATED = 'DOCUMENT_VERSION_CREATED', _('Document Version Created')
    DOCUMENT_ARCHIVED = 'DOCUMENT_ARCHIVED', _('Document Archived')
    DOCUMENT_RESTORED = 'DOCUMENT_RESTORED', _('Document Restored')
    DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED', _('Document Verified')
    DOCUMENT_REJECTED = 'DOCUMENT_REJECTED', _('Document Rejected')
    DOCUMENT_ACCESSED = 'DOCUMENT_ACCESSED', _('Document Accessed')
    DOCUMENT_ACCESS_DENIED = 'DOCUMENT_ACCESS_DENIED', _('Document Access Denied')
    DOCUMENT_QUARANTINED = 'DOCUMENT_QUARANTINED', _('Document Quarantined')
    DOCUMENT_OCR_PROCESSED = 'DOCUMENT_OCR_PROCESSED', _('Document OCR Processed')
    TEMPLATE_CREATED = 'TEMPLATE_CREATED', _('Template Created')
    TEMPLATE_VERSION_CREATED = 'TEMPLATE_VERSION_CREATED', _('Template Version Created')
    DOCUMENT_GENERATED = 'DOCUMENT_GENERATED', _('Document Generated From Template')


class DocumentType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    allowed_extensions = models.JSONField(default=list, help_text="e.g. ['.pdf', '.docx', '.jpg', '.png']")
    max_file_size = models.BigIntegerField(default=26214400, help_text="Max file size in bytes (default 25MB)")
    required = models.BooleanField(default=False)
    requires_ocr = models.BooleanField(default=True)
    requires_verification = models.BooleanField(default=False)
    expiry_required = models.BooleanField(default=False)
    versioning_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_documents'
    )

    owner_type = models.CharField(max_length=50, choices=OwnerType.choices, default=OwnerType.TENDER, db_index=True)
    owner_id = models.CharField(max_length=100, db_index=True, blank=True, null=True)

    document_type = models.ForeignKey(
        DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents'
    )
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, null=True)
    original_filename = models.CharField(max_length=255)

    storage_key = models.CharField(max_length=512, db_index=True)
    storage_bucket = models.CharField(max_length=128, default='tenderx-documents')
    mime_type = models.CharField(max_length=100, default='application/pdf')
    file_extension = models.CharField(max_length=20, default='.pdf')
    file_size = models.BigIntegerField(default=0)
    sha256_hash = models.CharField(max_length=64, db_index=True, blank=True, null=True)
    encryption_status = models.CharField(max_length=50, default='SSE-KMS')

    upload_status = models.CharField(max_length=30, choices=UploadStatus.choices, default=UploadStatus.INITIATED)
    scan_status = models.CharField(max_length=30, choices=ScanStatus.choices, default=ScanStatus.PENDING_SCAN)
    ocr_status = models.CharField(max_length=30, choices=OCRStatus.choices, default=OCRStatus.PENDING)
    verification_status = models.CharField(max_length=30, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED)
    lifecycle_status = models.CharField(max_length=30, choices=LifecycleStatus.choices, default=LifecycleStatus.INITIATED, db_index=True)

    current_version = models.PositiveIntegerField(default=1)
    is_template = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_documents'
    )

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_documents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_reason = models.TextField(blank=True, null=True)

    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'lifecycle_status']),
            models.Index(fields=['owner_type', 'owner_id']),
            models.Index(fields=['document_type', 'lifecycle_status']),
            models.Index(fields=['expires_at', 'lifecycle_status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.original_filename}) [v{self.current_version}]"

    @property
    def is_quarantined(self):
        return self.scan_status in [ScanStatus.INFECTED, ScanStatus.QUARANTINED] or self.lifecycle_status == LifecycleStatus.QUARANTINED

    @property
    def is_downloadable(self):
        if self.is_deleted or self.is_quarantined:
            return False
        return self.upload_status == UploadStatus.UPLOADED

    @property
    def days_until_expiry(self):
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return delta.days


class DocumentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    storage_key = models.CharField(max_length=512)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='application/pdf')
    sha256_hash = models.CharField(max_length=64, blank=True, null=True)
    change_summary = models.TextField(blank=True, null=True)
    is_current = models.BooleanField(default=True)

    encryption_metadata = models.JSONField(default=dict, blank=True)
    scan_status = models.CharField(max_length=30, choices=ScanStatus.choices, default=ScanStatus.PENDING_SCAN)
    ocr_status = models.CharField(max_length=30, choices=OCRStatus.choices, default=OCRStatus.PENDING)
    verification_status = models.CharField(max_length=30, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('document', 'version_number')

    def __str__(self):
        return f"{self.document.title} - v{self.version_number} ({'Current' if self.is_current else 'Historical'})"


class DocumentOCR(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='ocr_records')
    version_number = models.PositiveIntegerField(default=1)

    extracted_text = models.TextField(blank=True)
    language = models.CharField(max_length=20, default='en')
    confidence_score = models.FloatField(default=0.0)
    page_count = models.PositiveIntegerField(default=1)

    processing_status = models.CharField(max_length=30, choices=OCRStatus.choices, default=OCRStatus.PENDING)
    provider = models.CharField(max_length=30, choices=OCRProvider.choices, default=OCRProvider.MOCK)
    processing_time = models.FloatField(default=0.0, help_text="Processing time in seconds")
    error_message = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OCR for {self.document.title} v{self.version_number} [{self.processing_status}] ({self.confidence_score:.1f}%)"


class DocumentTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    category = models.ForeignKey(
        'tenders.TenderCategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='document_templates'
    )
    document_type = models.ForeignKey(
        DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='templates'
    )
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL, null=True, blank=True, related_name='document_templates'
    )

    version = models.PositiveIntegerField(default=1)
    template_content = models.TextField(help_text="Template text with Mustache-style variables like {{tender.title}}")
    variables_schema = models.JSONField(default=dict, blank=True, help_text="Schema describing expected variable definitions")
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code}) [v{self.version}]"


class DocumentAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=DocumentAuditAction.choices)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    performed_by_name = models.CharField(max_length=255, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        doc_info = self.document.title if self.document else "Global/Template"
        return f"[{self.action}] {doc_info} by {self.performed_by_name or 'System'} at {self.timestamp}"
