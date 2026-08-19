import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import datetime


class TenderStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    PUBLISHED = 'PUBLISHED', _('Published')
    ACTIVE = 'ACTIVE', _('Active')
    EVALUATION = 'EVALUATION', _('Evaluation')
    AWARDED = 'AWARDED', _('Awarded')
    CLOSED = 'CLOSED', _('Closed')
    CANCELLED = 'CANCELLED', _('Cancelled')


class TenderCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class TenderTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(TenderCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='templates')
    default_terms = models.TextField(blank=True, null=True, help_text='Default terms and conditions template')
    default_requirements = models.TextField(blank=True, null=True, help_text='Default evaluation criteria')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tender_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Tender(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender_number = models.CharField(max_length=50, unique=True, editable=False)
    title = models.CharField(max_length=500)
    description = models.TextField()
    category = models.ForeignKey(TenderCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders')
    template = models.ForeignKey(TenderTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders')

    # Organization & department
    organization = models.ForeignKey('accounts.Organization', on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders')
    department = models.ForeignKey('accounts.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='tenders')

    # Financial details
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    emd_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text='Earnest Money Deposit')
    currency = models.CharField(max_length=10, default='USD')

    # Dates
    publish_date = models.DateTimeField(null=True, blank=True)
    submission_deadline = models.DateTimeField()
    evaluation_start = models.DateTimeField(null=True, blank=True)
    evaluation_end = models.DateTimeField(null=True, blank=True)
    award_date = models.DateTimeField(null=True, blank=True)

    # Lifecycle
    status = models.CharField(max_length=20, choices=TenderStatus.choices, default=TenderStatus.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    evaluation_started_at = models.DateTimeField(null=True, blank=True)
    awarded_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Classification
    is_two_envelope = models.BooleanField(default=False, help_text='Technical + Financial envelopes')
    is_reverse_auction_eligible = models.BooleanField(default=False)
    location = models.CharField(max_length=500, blank=True, null=True)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tenders')
    organization_name = models.CharField(max_length=255, blank=True, null=True)

    # Versioning
    version = models.PositiveIntegerField(default=1)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tender_number}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.tender_number:
            self.tender_number = self._generate_tender_number()
        super().save(*args, **kwargs)

    def _generate_tender_number(self):
        year = timezone.now().year
        count = Tender.objects.filter(created_at__year=year).count() + 1
        return f"TDR-{year}-{count:04d}"

    @property
    def days_until_deadline(self):
        if self.submission_deadline:
            delta = self.submission_deadline - timezone.now()
            return max(0, delta.days)
        return 0

    @property
    def is_expired(self):
        if self.submission_deadline:
            return timezone.now() > self.submission_deadline
        return False

    def transition_to(self, new_status, user=None):
        """Transition tender to a new lifecycle status with validation."""
        valid_transitions = {
            TenderStatus.DRAFT: [TenderStatus.PUBLISHED, TenderStatus.CANCELLED],
            TenderStatus.PUBLISHED: [TenderStatus.ACTIVE, TenderStatus.CANCELLED],
            TenderStatus.ACTIVE: [TenderStatus.EVALUATION, TenderStatus.CANCELLED],
            TenderStatus.EVALUATION: [TenderStatus.AWARDED, TenderStatus.CLOSED],
            TenderStatus.AWARDED: [TenderStatus.CLOSED],
            TenderStatus.CLOSED: [],
            TenderStatus.CANCELLED: [],
        }

        allowed = valid_transitions.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {self.status} to {new_status}. "
                f"Allowed transitions: {', '.join(allowed) if allowed else 'None (terminal state)'}"
            )

        self.status = new_status
        now = timezone.now()

        if new_status == TenderStatus.PUBLISHED:
            self.published_at = now
            self.publish_date = self.publish_date or now
        elif new_status == TenderStatus.ACTIVE:
            self.activated_at = now
        elif new_status == TenderStatus.EVALUATION:
            self.evaluation_started_at = now
        elif new_status == TenderStatus.AWARDED:
            self.awarded_at = now
        elif new_status == TenderStatus.CLOSED:
            self.closed_at = now

        self.save()


class BOQItem(models.Model):
    """Bill of Quantities line item for a tender."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='boq_items')
    item_number = models.PositiveIntegerField()
    description = models.TextField()
    unit = models.CharField(max_length=50, default='Unit')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    specifications = models.TextField(blank=True, null=True, help_text='Technical specifications for this item')

    class Meta:
        ordering = ['item_number']
        unique_together = ('tender', 'item_number')

    def __str__(self):
        return f"Item {self.item_number}: {self.description[:50]}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class TenderAmendment(models.Model):
    """Tracks amendments/changes to published tenders."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='amendments')
    amendment_number = models.PositiveIntegerField(editable=False)
    title = models.CharField(max_length=500)
    description = models.TextField()
    changes_summary = models.TextField(help_text='Summary of what changed')
    previous_values = models.JSONField(default=dict, blank=True, help_text='JSON snapshot of changed fields before amendment')
    new_values = models.JSONField(default=dict, blank=True, help_text='JSON snapshot of new values after amendment')

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tender_amendments')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-amendment_number']

    def __str__(self):
        return f"Amendment #{self.amendment_number} for {self.tender.tender_number}"

    def save(self, *args, **kwargs):
        if not self.amendment_number:
            last = TenderAmendment.objects.filter(tender=self.tender).order_by('-amendment_number').first()
            self.amendment_number = (last.amendment_number + 1) if last else 1
        super().save(*args, **kwargs)


class TenderDocument(models.Model):
    """Documents attached to a tender (RFP, BOQ, specifications, etc.)."""
    DOCUMENT_TYPES = [
        ('RFP', 'Request for Proposal'),
        ('BOQ', 'Bill of Quantities'),
        ('SPEC', 'Technical Specifications'),
        ('TNC', 'Terms & Conditions'),
        ('ADDENDUM', 'Addendum'),
        ('AMENDMENT', 'Amendment Document'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='OTHER')
    file_url = models.URLField(max_length=500, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tender_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} ({self.document_type}) for {self.tender.tender_number}"
