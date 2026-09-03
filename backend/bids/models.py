import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.exceptions import ValidationError


# ──────────────────────────────────────────────
# ENUMS
# ──────────────────────────────────────────────

class BidStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    SUBMISSION_IN_PROGRESS = 'SUBMISSION_IN_PROGRESS', _('Submission In Progress')
    SUBMITTED = 'SUBMITTED', _('Submitted')
    AMENDMENT_ALLOWED = 'AMENDMENT_ALLOWED', _('Amendment Allowed')
    AMENDMENT_SUBMITTED = 'AMENDMENT_SUBMITTED', _('Amendment Submitted')
    WITHDRAWAL_REQUESTED = 'WITHDRAWAL_REQUESTED', _('Withdrawal Requested')
    WITHDRAWN = 'WITHDRAWN', _('Withdrawn')
    LOCKED = 'LOCKED', _('Locked')
    TECHNICAL_OPENED = 'TECHNICAL_OPENED', _('Technical Opened')
    TECHNICAL_EVALUATION = 'TECHNICAL_EVALUATION', _('Technical Evaluation')
    FINANCIAL_OPENING_AUTHORIZED = 'FINANCIAL_OPENING_AUTHORIZED', _('Financial Opening Authorized')
    FINANCIAL_OPENED = 'FINANCIAL_OPENED', _('Financial Opened')
    EVALUATED = 'EVALUATED', _('Evaluated')
    AWARDED = 'AWARDED', _('Awarded')
    REJECTED = 'REJECTED', _('Rejected')
    DISQUALIFIED = 'DISQUALIFIED', _('Disqualified')


class BidDocumentType(models.TextChoices):
    TECHNICAL_PROPOSAL = 'TECHNICAL_PROPOSAL', _('Technical Proposal')
    FINANCIAL_PROPOSAL = 'FINANCIAL_PROPOSAL', _('Financial Proposal')
    COMPANY_REGISTRATION = 'COMPANY_REGISTRATION', _('Company Registration')
    TAX_CERTIFICATE = 'TAX_CERTIFICATE', _('Tax Certificate')
    EXPERIENCE_CERTIFICATE = 'EXPERIENCE_CERTIFICATE', _('Experience Certificate')
    WORK_ORDER = 'WORK_ORDER', _('Work Order / Completion Certificate')
    BANK_GUARANTEE = 'BANK_GUARANTEE', _('Bank Guarantee / Bid Security')
    DECLARATION = 'DECLARATION', _('Declaration / Affidavit')
    AUTHORIZATION_LETTER = 'AUTHORIZATION_LETTER', _('Authorization Letter')
    OTHER = 'OTHER', _('Other Supporting Document')


class BidDocumentVerificationStatus(models.TextChoices):
    UPLOADED = 'UPLOADED', _('Uploaded')
    SCANNING = 'SCANNING', _('Scanning')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')


class OpeningStage(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', _('Not Started')
    TECHNICAL_AUTHORIZED = 'TECHNICAL_AUTHORIZED', _('Technical Opening Authorized')
    TECHNICAL_OPENED = 'TECHNICAL_OPENED', _('Technical Opened')
    FINANCIAL_AUTHORIZED = 'FINANCIAL_AUTHORIZED', _('Financial Opening Authorized')
    FINANCIAL_OPENED = 'FINANCIAL_OPENED', _('Financial Opened')
    COMPLETED = 'COMPLETED', _('Opening Completed')


class IntegrityStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending Verification')
    VERIFIED = 'VERIFIED', _('Integrity Verified')
    FAILURE = 'FAILURE', _('Integrity Failure')
    TAMPERED = 'TAMPERED', _('Tampered')


# ──────────────────────────────────────────────
# BID CORE MODEL
# ──────────────────────────────────────────────

class Bid(models.Model):
    """
    Core bid entity. Represents a vendor's submission for a specific tender.
    Enforces one active bid per vendor per tender (unless tender allows multiple).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relationships
    tender = models.ForeignKey(
        'tenders.Tender', on_delete=models.CASCADE,
        related_name='bids', db_index=True
    )
    vendor = models.ForeignKey(
        'vendors.Vendor', on_delete=models.CASCADE,
        related_name='bids', db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_bids'
    )

    # Reference
    bid_reference = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=35, choices=BidStatus.choices,
        default=BidStatus.DRAFT, db_index=True
    )
    current_version = models.PositiveIntegerField(default=1)

    # Timestamps (authoritative — server-controlled)
    submitted_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Metadata
    is_deleted = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tender', 'vendor']),
            models.Index(fields=['tender', 'status']),
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tender', 'vendor'],
                condition=models.Q(is_deleted=False),
                name='unique_active_bid_per_vendor_per_tender'
            )
        ]

    def __str__(self):
        return f"{self.bid_reference} - {self.vendor.company_name} for {self.tender.tender_number}"

    @property
    def ismodifiable(self):
        """Check if bid can currently be modified by vendor."""
        return self.status in [
            BidStatus.DRAFT,
            BidStatus.SUBMISSION_IN_PROGRESS,
            BidStatus.AMENDMENT_ALLOWED,
        ]

    @property
    def is_submitted(self):
        return self.status not in [
            BidStatus.DRAFT,
            BidStatus.SUBMISSION_IN_PROGRESS,
            BidStatus.WITHDRAWN,
        ]

    @property
    def can_withdraw(self):
        """Check if bid can be withdrawn."""
        return self.status in [
            BidStatus.SUBMITTED,
            BidStatus.AMENDMENT_ALLOWED,
            BidStatus.AMENDMENT_SUBMITTED,
        ]

    def clean(self):
        """Model-level validation."""
        if self.locked_at and self.ismodifiable:
            raise ValidationError("Locked bids cannot be modified.")


# ──────────────────────────────────────────────
# BID VERSION
# ──────────────────────────────────────────────

class BidVersion(models.Model):
    """
    Immutable snapshot of a bid at each meaningful change point.
    Never overwrite — always create new version records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()

    # Snapshots
    technical_snapshot = models.JSONField(default=dict, blank=True)
    financial_snapshot = models.JSONField(default=dict, blank=True)
    document_references = models.JSONField(default=list, blank=True)

    # Metadata
    change_summary = models.TextField(blank=True, null=True)
    change_type = models.CharField(max_length=50, default='CREATED')
    # change_type: CREATED, AMENDED, SUBMITTED, AMENDMENT_SUBMITTED
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='bid_versions'
    )
    integrity_hash = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('bid', 'version_number')

    def __str__(self):
        return f"{self.bid.bid_reference} v{self.version_number}"


# ──────────────────────────────────────────────
# TECHNICAL BID
# ──────────────────────────────────────────────

class TechnicalBid(models.Model):
    """
    Non-financial proposal content. No financial data stored here.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.OneToOneField(Bid, on_delete=models.CASCADE, related_name='technical_bid')

    methodology = models.TextField(
        blank=True, null=True,
        help_text=_('Technical approach and methodology')
    )
    technical_description = models.TextField(
        blank=True, null=True,
        help_text=_('Detailed technical description of the proposed solution')
    )
    implementation_plan = models.TextField(
        blank=True, null=True,
        help_text=_('Implementation timeline and approach')
    )
    delivery_plan = models.TextField(
        blank=True, null=True,
        help_text=_('Delivery schedule and milestones')
    )
    team_information = models.TextField(
        blank=True, null=True,
        help_text=_('Key personnel and their qualifications')
    )
    compliance_statement = models.TextField(
        blank=True, null=True,
        help_text=_('Statement of compliance with tender requirements')
    )
    equipment_details = models.TextField(
        blank=True, null=True,
        help_text=_('Equipment and resources to be deployed')
    )
    quality_assurance = models.TextField(
        blank=True, null=True,
        help_text=_('Quality assurance approach')
    )

    # Scoring (set by evaluators after technical opening)
    technical_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='technical_evaluations'
    )
    evaluated_at = models.DateTimeField(null=True, blank=True)
    evaluation_remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Technical Bids'

    def __str__(self):
        return f"Technical Bid for {self.bid.bid_reference}"


# ──────────────────────────────────────────────
# FINANCIAL BID (HIGHLY CONFIDENTIAL)
# ──────────────────────────────────────────────

class FinancialBid(models.Model):
    """
    Financial proposal — strictly confidential until authorized financial opening.
    Server-side access control is mandatory. Never expose via generic serializers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.OneToOneField(Bid, on_delete=models.CASCADE, related_name='financial_bid')

    # Financial data
    currency = models.CharField(max_length=10, default='INR')
    total_amount = models.DecimalField(max_digits=16, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=16, decimal_places=2)
    pricing_breakdown = models.JSONField(default=dict, blank=True)
    # pricing_breakdown: { "item_1": {"description": "...", "quantity": 10, "unit_price": 5000}, ... }

    # Encryption-at-rest placeholder (production would use KMS)
    encrypted_payload = models.TextField(
        blank=True, null=True,
        help_text=_('AES-256 encrypted financial payload for sealed bid protection')
    )
    encryption_key_ref = models.CharField(
        max_length=255, blank=True, null=True,
        help_text=_('Reference to encryption key in secret management system')
    )

    # Opening metadata
    opened_at = models.DateTimeField(null=True, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='financial_openings'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Financial Bids'

    def __str__(self):
        return f"Financial Bid for {self.bid.bid_reference} ({self.currency} {self.final_amount})"

    def get_sealed_view(self):
        """Return a redacted view for unauthorized access."""
        return {
            'status': 'SEALED',
            'message': 'Financial details are sealed until authorized opening.',
            'currency': self.currency,
        }

    def get_full_view(self):
        """Return full financial data (only after authorized opening)."""
        return {
            'currency': self.currency,
            'total_amount': str(self.total_amount),
            'tax_amount': str(self.tax_amount),
            'discount': str(self.discount),
            'final_amount': str(self.final_amount),
            'pricing_breakdown': self.pricing_breakdown,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
        }


# ──────────────────────────────────────────────
# BID DOCUMENT
# ──────────────────────────────────────────────

class BidDocument(models.Model):
    """
    Document attached to a bid. Supports verification workflow.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='documents')

    document_type = models.CharField(
        max_length=40, choices=BidDocumentType.choices,
        default=BidDocumentType.OTHER
    )
    original_filename = models.CharField(max_length=255)
    storage_key = models.CharField(max_length=500, blank=True, null=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0)
    sha256_hash = models.CharField(max_length=128, blank=True, null=True)
    version = models.PositiveIntegerField(default=1)

    # Upload metadata
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='bid_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Verification
    verification_status = models.CharField(
        max_length=20, choices=BidDocumentVerificationStatus.choices,
        default=BidDocumentVerificationStatus.UPLOADED
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_bid_docs'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    # Soft delete
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_filename} ({self.get_document_type_display()}) - Bid {self.bid.bid_reference}"

    def calculate_hash(self, file_content=None):
        """Calculate SHA-256 hash of document content."""
        if file_content and isinstance(file_content, (bytes, bytearray)):
            hash_obj = hashlib.sha256(file_content)
            self.sha256_hash = hash_obj.hexdigest()
        return self.sha256_hash


# ──────────────────────────────────────────────
# BID AMENDMENT
# ──────────────────────────────────────────────

class BidAmendment(models.Model):
    """
    Records a vendor-initiated amendment to their bid.
    Previous versions remain immutable; a new version is created.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='amendments')
    amendment_number = models.PositiveIntegerField()

    # Amendment details
    reason = models.TextField(help_text=_('Reason for amendment'))
    changes_description = models.TextField(
        blank=True, null=True,
        help_text=_('Summary of changes made')
    )
    changed_sections = models.JSONField(
        default=list, blank=True,
        help_text=_('List of sections changed: ["technical", "financial", "documents"]')
    )

    # Version tracking
    previous_version = models.PositiveIntegerField()
    new_version = models.PositiveIntegerField()

    # State
    status = models.CharField(
        max_length=30, default='DRAFT',
        choices=[
            ('DRAFT', 'Draft'),
            ('SUBMITTED', 'Submitted'),
            ('REJECTED', 'Rejected'),
        ]
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='bid_amendments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['amendment_number']
        unique_together = ('bid', 'amendment_number')

    def __str__(self):
        return f"Amendment #{self.amendment_number} for {self.bid.bid_reference}"


# ──────────────────────────────────────────────
# BID WITHDRAWAL
# ──────────────────────────────────────────────

class BidWithdrawal(models.Model):
    """
    Records a vendor's bid withdrawal request. Bids are never physically deleted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.OneToOneField(Bid, on_delete=models.CASCADE, related_name='withdrawal')

    reason = models.TextField(help_text=_('Reason for withdrawal'))
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='bid_withdrawals'
    )
    status = models.CharField(
        max_length=20, default='PENDING',
        choices=[
            ('PENDING', 'Pending Approval'),
            ('APPROVED', 'Approved'),
            ('REJECTED', 'Rejected'),
        ]
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_withdrawals'
    )
    approval_remarks = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Bid Withdrawals'

    def __str__(self):
        return f"Withdrawal for {self.bid.bid_reference} - {self.status}"


# ──────────────────────────────────────────────
# BID OPENING
# ──────────────────────────────────────────────

class BidOpening(models.Model):
    """
    Controls the authorized bid-opening workflow for a tender.
    Tracks technical and financial opening stages separately.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(
        'tenders.Tender', on_delete=models.CASCADE,
        related_name='bid_openings'
    )

    stage = models.CharField(
        max_length=30, choices=OpeningStage.choices,
        default=OpeningStage.NOT_STARTED
    )
    total_bids_received = models.PositiveIntegerField(default=0)
    total_bids_locked = models.PositiveIntegerField(default=0)
    integrity_checks_passed = models.PositiveIntegerField(default=0)
    integrity_checks_failed = models.PositiveIntegerField(default=0)

    # Technical Opening
    technical_opening_authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='technical_openings_authorized'
    )
    technical_opening_authorized_at = models.DateTimeField(null=True, blank=True)
    technical_opened_at = models.DateTimeField(null=True, blank=True)
    technical_opening_notes = models.TextField(blank=True, null=True)

    # Financial Opening
    financial_opening_authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='financial_openings_authorized'
    )
    financial_opening_authorized_at = models.DateTimeField(null=True, blank=True)
    financial_opened_at = models.DateTimeField(null=True, blank=True)
    financial_opening_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Bid Opening for {self.tender.tender_number} - {self.get_stage_display()}"


# ──────────────────────────────────────────────
# BID OPENING AUTHORIZATION
# ──────────────────────────────────────────────

class BidOpeningAuthorization(models.Model):
    """
    Records who is authorized to participate in bid opening.
    Prevents unauthorized access to financial bid data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    opening = models.ForeignKey(
        BidOpening, on_delete=models.CASCADE,
        related_name='authorizations'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='bid_opening_authorizations'
    )
    role_in_opening = models.CharField(
        max_length=50,
        choices=[
            ('BID_OPENING_OFFICER', 'Bid Opening Officer'),
            ('AUTHORIZED_EVALUATOR', 'Authorized Evaluator'),
            ('TECHNICAL_EVALUATOR', 'Technical Evaluator'),
            ('FINANCIAL_EVALUATOR', 'Financial Evaluator'),
            ('AUDITOR', 'Auditor'),
            ('WITNESS', 'Witness'),
        ]
    )
    authorized_at = models.DateTimeField(auto_now_add=True)
    authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='granted_opening_authorizations'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('opening', 'user')

    def __str__(self):
        return f"{self.user.full_name} authorized as {self.role_in_opening} for {self.opening}"


# ──────────────────────────────────────────────
# BID ACCESS LOG (AUDIT)
# ──────────────────────────────────────────────

class BidAccessLog(models.Model):
    """
    Comprehensive audit trail for every security-sensitive bid operation.
    Never log: passwords, encryption keys, financial payloads, sensitive tokens.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.ForeignKey(
        Bid, on_delete=models.CASCADE,
        related_name='access_logs', null=True, blank=True
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='bid_access_logs'
    )
    actor_name = models.CharField(max_length=255, blank=True, null=True)
    actor_role = models.CharField(max_length=30, blank=True, null=True)

    action = models.CharField(max_length=100, db_index=True)
    # Actions: BID_CREATED, BID_UPDATED, DOCUMENT_UPLOADED, DOCUMENT_VERIFIED,
    #          BID_SUBMITTED, BID_AMENDED, BID_WITHDRAWN, BID_LOCKED,
    #          TECHNICAL_OPENING, FINANCIAL_OPENING, INTEGRITY_CHECK,
    #          FAILED_AUTHORIZATION, FAILED_OPENING, BID_VIEWED, etc.

    resource_type = models.CharField(max_length=50, default='Bid')
    resource_id = models.CharField(max_length=100, blank=True, null=True)
    resource_reference = models.CharField(max_length=100, blank=True, null=True)

    outcome = models.CharField(
        max_length=20, default='SUCCESS',
        choices=[
            ('SUCCESS', 'Success'),
            ('FAILURE', 'Failure'),
            ('DENIED', 'Denied'),
        ]
    )
    metadata = models.JSONField(default=dict, blank=True)
    # metadata must NOT contain: passwords, keys, financial data

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    correlation_id = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.action}] {self.actor_name or 'System'} - {self.outcome} at {self.timestamp}"

    @classmethod
    def log(cls, bid=None, actor=None, action='', resource_type='Bid',
            resource_id=None, resource_reference=None, outcome='SUCCESS',
            metadata=None, request=None, correlation_id=None):
        """Helper to create an audit log entry."""
        ip = None
        user_agent = None
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
            if ip and ',' in ip:
                ip = ip.split(',')[0].strip()
            user_agent = request.META.get('HTTP_USER_AGENT', 'Browser')

        actor_name = None
        actor_role = None
        if actor and hasattr(actor, 'full_name'):
            actor_name = actor.full_name
            actor_role = getattr(actor, 'role', None)

        # Sanitize metadata — remove sensitive fields
        safe_metadata = {}
        if metadata:
            sensitive_keys = {'password', 'secret', 'key', 'token', 'financial', 'amount', 'total'}
            for k, v in metadata.items():
                if not any(sk in k.lower() for sk in sensitive_keys):
                    safe_metadata[k] = v

        return cls.objects.create(
            bid=bid,
            actor=actor,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            resource_reference=str(resource_reference) if resource_reference else None,
            outcome=outcome,
            metadata=safe_metadata,
            ip_address=ip,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )


# ──────────────────────────────────────────────
# BID INTEGRITY RECORD
# ──────────────────────────────────────────────

class BidIntegrityRecord(models.Model):
    """
    Cryptographic integrity verification for sealed bids.
    At submission, a digest is computed from bid data + documents + version.
    At opening, the digest is recomputed and compared.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bid = models.OneToOneField(
        Bid, on_delete=models.CASCADE,
        related_name='integrity_record'
    )

    # The integrity digest
    integrity_hash = models.CharField(
        max_length=128, db_index=True,
        help_text=_('SHA-256 digest of canonical bid representation')
    )
    # Components used in hash computation (for audit)
    hash_components = models.JSONField(
        default=dict, blank=True,
        help_text=_('Record of what was included in the hash')
    )

    # Verification status
    status = models.CharField(
        max_length=20, choices=IntegrityStatus.choices,
        default=IntegrityStatus.PENDING
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='integrity_verifications'
    )

    # Recomputation results
    recomputed_hash = models.CharField(max_length=128, blank=True, null=True)
    verification_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Bid Integrity Records'

    def __str__(self):
        return f"Integrity: {self.bid.bid_reference} - {self.get_status_display()}"

    @staticmethod
    def compute_integrity_hash(bid_data, documents_hash, version, tender_id, vendor_id):
        """
        Compute a SHA-256 integrity hash from canonical bid representation.
        In production, use HMAC with a secret key from KMS.
        """
        canonical = f"{tender_id}:{vendor_id}:v{version}:{bid_data}:{documents_hash}"
        return hashlib.sha256(canonical.encode('utf-8')).hexdigest()
