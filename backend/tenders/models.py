import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class TenderStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    PUBLISHED = 'PUBLISHED', _('Published')
    ACTIVE = 'ACTIVE', _('Active')
    EVALUATION = 'EVALUATION', _('Under Evaluation')
    AWARDED = 'AWARDED', _('Awarded')
    CLOSED = 'CLOSED', _('Closed')
    CANCELLED = 'CANCELLED', _('Cancelled')


class ProcurementMethod(models.TextChoices):
    OPEN_TENDER = 'OPEN_TENDER', _('Open National/International Tendering')
    RESTRICTED_TENDER = 'RESTRICTED_TENDER', _('Restricted Tendering')
    TWO_STAGE_TENDERING = 'TWO_STAGE_TENDERING', _('Two-Stage Tendering')
    SINGLE_SOURCE = 'SINGLE_SOURCE', _('Single-Source Procurement')
    REQUEST_FOR_QUOTATION = 'REQUEST_FOR_QUOTATION', _('Request for Quotations (RFQ)')


class AmendmentStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft Amendment')
    PUBLISHED = 'PUBLISHED', _('Published Amendment')
    CANCELLED = 'CANCELLED', _('Cancelled Amendment')


class TenderCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    parent_category = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Tender Categories'
        ordering = ['name']

    def __str__(self):
        if self.parent_category:
            return f"{self.parent_category.name} > {self.name}"
        return self.name


class Tender(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender_number = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField()
    
    category = models.ForeignKey(
        TenderCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders', db_index=True
    )
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders', db_index=True
    )
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tenders'
    )

    status = models.CharField(
        max_length=30, choices=TenderStatus.choices, default=TenderStatus.DRAFT, db_index=True
    )
    procurement_method = models.CharField(
        max_length=50, choices=ProcurementMethod.choices, default=ProcurementMethod.OPEN_TENDER
    )
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='USD')

    publication_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    opening_date = models.DateTimeField(null=True, blank=True)
    evaluation_start_date = models.DateTimeField(null=True, blank=True)
    award_date = models.DateTimeField(null=True, blank=True)
    closed_date = models.DateTimeField(null=True, blank=True)

    eligibility_criteria = models.TextField(blank=True, null=True)
    technical_requirements = models.TextField(blank=True, null=True)
    financial_requirements = models.TextField(blank=True, null=True)

    estimated_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    bid_security_required = models.BooleanField(default=False)
    bid_security_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    contact_person = models.CharField(max_length=150, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)

    version = models.PositiveIntegerField(default=1)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'submission_deadline']),
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['category', 'status']),
        ]

    def __str__(self):
        return f"{self.tender_number} - {self.title} ({self.get_status_display()})"

    @property
    def effective_organization_name(self):
        if self.organization:
            return self.organization.name
        return self.organization_name or "General Procurement Authority"


class TenderDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='documents')
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500)
    file_size = models.PositiveIntegerField(default=0)
    file_type = models.CharField(max_length=50, default='PDF')
    file_hash = models.CharField(max_length=128, blank=True, null=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} for Tender {self.tender.tender_number}"


class TenderStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    changed_by_name = models.CharField(max_length=255, blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"Tender {self.tender.tender_number}: {self.from_status} -> {self.to_status}"


class TenderTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(TenderCategory, on_delete=models.SET_NULL, null=True, blank=True)
    template_data = models.JSONField(default=dict)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    organization = models.ForeignKey('accounts.Organization', on_delete=models.SET_NULL, null=True, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class TenderAmendment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='amendments')
    amendment_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    reason = models.TextField()
    changes = models.JSONField(default=dict)
    previous_version = models.PositiveIntegerField()
    new_version = models.PositiveIntegerField()
    effective_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=AmendmentStatus.choices, default=AmendmentStatus.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['amendment_number']
        unique_together = ('tender', 'amendment_number')

    def __str__(self):
        return f"Amendment #{self.amendment_number} for Tender {self.tender.tender_number}"


class TenderVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    snapshot = models.JSONField(default=dict)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    change_type = models.CharField(max_length=50, default='UPDATED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('tender', 'version_number')

    def __str__(self):
        return f"Tender {self.tender.tender_number} v{self.version_number}"
