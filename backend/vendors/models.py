import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# ──────────────────────────────────────────────
# ENUMS
# ──────────────────────────────────────────────

class VendorStatus(models.TextChoices):
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', _('Pending Verification')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')
    SUSPENDED = 'SUSPENDED', _('Suspended')
    BLACKLISTED = 'BLACKLISTED', _('Blacklisted')
    DEACTIVATED = 'DEACTIVATED', _('Deactivated')


class DocumentStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')
    EXPIRED = 'EXPIRED', _('Expired')


class DocumentType(models.TextChoices):
    COMPANY_REGISTRATION = 'COMPANY_REGISTRATION', _('Company Registration Certificate')
    TAX_CERTIFICATE = 'TAX_CERTIFICATE', _('Tax/GST Certificate')
    BUSINESS_LICENSE = 'BUSINESS_LICENSE', _('Business License')
    ADDRESS_PROOF = 'ADDRESS_PROOF', _('Address Proof')
    IDENTITY_PROOF = 'IDENTITY_PROOF', _('Identity/Authorized Representative Proof')
    BANK_DETAILS = 'BANK_DETAILS', _('Bank Details/Cancelled Cheque')
    CERTIFICATION = 'CERTIFICATION', _('Relevant Certification')
    WORK_CERTIFICATE = 'WORK_CERTIFICATE', _('Previous Work Certificate')
    OTHER = 'OTHER', _('Other Document')


class ReviewStatus(models.TextChoices):
    PUBLISHED = 'PUBLISHED', _('Published')
    PENDING = 'PENDING', _('Pending')
    FLAGGED = 'FLAGGED', _('Flagged')
    HIDDEN = 'HIDDEN', _('Hidden')


class BlacklistStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    EXPIRED = 'EXPIRED', _('Expired')
    APPEALED = 'APPEALED', _('Appealed')
    LIFTED = 'LIFTED', _('Lifted')


class AuditAction(models.TextChoices):
    REGISTRATION = 'REGISTRATION', _('Registration')
    PROFILE_UPDATE = 'PROFILE_UPDATE', _('Profile Update')
    DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD', _('Document Upload')
    DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION', _('Document Verification')
    DOCUMENT_REJECTION = 'DOCUMENT_REJECTION', _('Document Rejection')
    STATUS_CHANGE = 'STATUS_CHANGE', _('Status Change')
    SUSPENSION = 'SUSPENSION', _('Suspension')
    BLACKLISTING = 'BLACKLISTING', _('Blacklisting')
    REINSTATEMENT = 'REINSTATEMENT', _('Reinstatement')
    RATING_SUBMISSION = 'RATING_SUBMISSION', _('Rating Submission')
    REVIEW_SUBMISSION = 'REVIEW_SUBMISSION', _('Review Submission')
    ADMIN_ACTION = 'ADMIN_ACTION', _('Admin Action')


# ──────────────────────────────────────────────
# CORE MODELS
# ──────────────────────────────────────────────

class VendorCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    parent_category = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='subcategories'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Vendor Categories'
        ordering = ['name']

    def __str__(self):
        if self.parent_category:
            return f"{self.parent_category.name} > {self.name}"
        return self.name


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='vendor_profile', null=True, blank=True
    )

    # Basic Information
    company_name = models.CharField(max_length=255, db_index=True)
    registration_number = models.CharField(max_length=100, unique=True, db_index=True)
    business_type = models.CharField(max_length=100, blank=True, null=True)
    industry = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    year_established = models.PositiveIntegerField(null=True, blank=True)

    # Contact Information
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(max_length=500, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')

    # Tax / Financial
    tax_number = models.CharField(max_length=100, blank=True, null=True)
    num_employees = models.PositiveIntegerField(null=True, blank=True)
    annual_turnover = models.DecimalField(
        max_digits=16, decimal_places=2, null=True, blank=True
    )

    # Contact Person
    contact_person_name = models.CharField(max_length=255, blank=True, null=True)
    contact_person_designation = models.CharField(max_length=150, blank=True, null=True)
    contact_person_email = models.EmailField(blank=True, null=True)
    contact_person_phone = models.CharField(max_length=50, blank=True, null=True)

    # Logo
    company_logo = models.URLField(max_length=500, blank=True, null=True)

    # Status
    status = models.CharField(
        max_length=30, choices=VendorStatus.choices,
        default=VendorStatus.PENDING_VERIFICATION, db_index=True
    )
    is_draft = models.BooleanField(default=False, db_index=True)

    # Ratings (cached aggregates)
    overall_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00
    )
    quality_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    technical_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    timeliness_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    communication_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    compliance_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count = models.PositiveIntegerField(default=0)

    # Performance (cached)
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    completed_projects = models.PositiveIntegerField(default=0)
    active_projects = models.PositiveIntegerField(default=0)
    total_bids = models.PositiveIntegerField(default=0)
    won_bids = models.PositiveIntegerField(default=0)
    on_time_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    # Categories (M2M)
    categories = models.ManyToManyField(VendorCategory, blank=True, related_name='vendors')

    # Profile completion
    profile_completion = models.PositiveIntegerField(default=0)

    # Meta
    verified_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['company_name', 'status']),
        ]

    def __str__(self):
        return f"{self.company_name} ({self.get_status_display()})"

    @property
    def display_rating(self):
        if self.rating_count == 0:
            return "No ratings"
        return f"{self.overall_rating}/5.0 ({self.rating_count} ratings)"

    def calculate_profile_completion(self):
        total_fields = 14
        completed = 0
        if self.company_name: completed += 1
        if self.registration_number: completed += 1
        if self.email: completed += 1
        if self.phone: completed += 1
        if self.description: completed += 1
        if self.business_type: completed += 1
        if self.industry: completed += 1
        if self.year_established: completed += 1
        if self.address: completed += 1
        if self.city: completed += 1
        if self.state: completed += 1
        if self.country: completed += 1
        if self.contact_person_name: completed += 1
        if self.contact_person_email: completed += 1
        self.profile_completion = int((completed / total_fields) * 100)
        return self.profile_completion


class VendorDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(
        max_length=50, choices=DocumentType.choices, default=DocumentType.OTHER
    )
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0)
    file_type = models.CharField(max_length=50, default='PDF')
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING, db_index=True
    )
    reviewer_remarks = models.TextField(blank=True, null=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_vendor_docs'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.file_name} ({self.get_status_display()})"

    @property
    def is_expired(self):
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False

    @property
    def days_until_expiry(self):
        if self.expiry_date:
            delta = self.expiry_date - timezone.now().date()
            return max(0, delta.days)
        return None


class VendorCertification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=255)
    issuing_authority = models.CharField(max_length=255, blank=True, null=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    certificate_number = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.name} ({self.vendor.company_name})"


class VendorExperience(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='experience_records')
    project_name = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    project_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name_plural = 'Vendor Experiences'

    def __str__(self):
        return f"{self.project_name} - {self.vendor.company_name}"


class VendorCategoryAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='category_assignments')
    category = models.ForeignKey(VendorCategory, on_delete=models.CASCADE, related_name='vendor_assignments')
    specialization = models.CharField(max_length=255, blank=True, null=True)
    skills = models.JSONField(default=list, blank=True)
    services_offered = models.JSONField(default=list, blank=True)
    is_primary = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('vendor', 'category')

    def __str__(self):
        return f"{self.vendor.company_name} -> {self.category.name}"


class VendorRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='ratings')
    rated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='vendor_ratings_given'
    )
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_ratings'
    )
    tender = models.ForeignKey(
        'tenders.Tender', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_ratings'
    )

    overall_performance = models.PositiveSmallIntegerField(default=3)
    quality_of_work = models.PositiveSmallIntegerField(default=3)
    technical_capability = models.PositiveSmallIntegerField(default=3)
    timeliness = models.PositiveSmallIntegerField(default=3)
    communication = models.PositiveSmallIntegerField(default=3)
    professionalism = models.PositiveSmallIntegerField(default=3)
    compliance = models.PositiveSmallIntegerField(default=3)
    value_for_money = models.PositiveSmallIntegerField(default=3)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('vendor', 'tender')

    def __str__(self):
        return f"Rating for {self.vendor.company_name} ({self.overall_performance}/5)"

    @property
    def average_score(self):
        scores = [
            self.overall_performance, self.quality_of_work,
            self.technical_capability, self.timeliness,
            self.communication, self.professionalism,
            self.compliance, self.value_for_money,
        ]
        return round(sum(scores) / len(scores), 2)


class VendorReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='reviews')
    review_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='vendor_reviews_given'
    )
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_reviews'
    )
    tender = models.ForeignKey(
        'tenders.Tender', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_reviews'
    )
    rating = models.ForeignKey(
        VendorRating, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviews'
    )

    comment = models.TextField()
    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING, db_index=True
    )
    vendor_response = models.TextField(blank=True, null=True)
    vendor_response_date = models.DateTimeField(null=True, blank=True)

    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='moderated_vendor_reviews'
    )
    moderation_remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review for {self.vendor.company_name} by {self.review_by or 'Anonymous'}"


class VendorPerformanceRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='performance_records')
    tender = models.ForeignKey(
        'tenders.Tender', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_performance'
    )
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    contract_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    start_date = models.DateField(null=True, blank=True)
    expected_completion = models.DateField(null=True, blank=True)
    actual_completion = models.DateField(null=True, blank=True)

    quality_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    timeliness_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    technical_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    communication_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    compliance_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    organization_remarks = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Performance: {self.vendor.company_name} - Score: {self.overall_rating}"

    @property
    def weighted_score(self):
        """Calculate weighted performance score using configurable weights."""
        return (
            float(self.quality_score) * 0.30 +
            float(self.timeliness_score) * 0.20 +
            float(self.technical_score) * 0.20 +
            float(self.communication_score) * 0.10 +
            float(self.compliance_score) * 0.10 +
            float(self.overall_rating) * 0.10
        )


class VendorStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=30, blank=True, null=True)
    to_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_status_changes'
    )
    changed_by_name = models.CharField(max_length=255, blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.vendor.company_name}: {self.from_status} -> {self.to_status}"


class VendorBlacklist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='blacklist_records')
    reason = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    is_permanent = models.BooleanField(default=False)
    evidence_file = models.URLField(max_length=500, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='vendor_blacklists'
    )
    created_by_name = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=BlacklistStatus.choices,
        default=BlacklistStatus.ACTIVE, db_index=True
    )
    appeal_remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Blacklist: {self.vendor.company_name} - {self.reason}"


class VendorSuspension(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='suspensions')
    reason = models.CharField(max_length=255)
    remarks = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    is_auto_restore = models.BooleanField(
        default=True, help_text='Automatically restore VERIFIED status after expiry'
    )
    restored = models.BooleanField(default=False)
    restored_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='vendor_suspensions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Suspension: {self.vendor.company_name} - {self.reason}"

    @property
    def is_expired(self):
        if self.end_date and timezone.now() > self.end_date:
            return True
        return False


class VendorAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(
        Vendor, on_delete=models.CASCADE,
        related_name='audit_logs', null=True, blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vendor_audit_logs'
    )
    user_name = models.CharField(max_length=255, blank=True, null=True)
    action = models.CharField(max_length=50, choices=AuditAction.choices)
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        vendor_name = self.vendor.company_name if self.vendor else 'System'
        return f"[{self.action}] {vendor_name} at {self.timestamp}"


class VendorNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, default='INFO')
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.vendor.company_name}"
