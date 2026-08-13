import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import datetime


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', _('Super Admin')
    ORG_ADMIN = 'ORG_ADMIN', _('Organization Admin')
    TENDER_MANAGER = 'TENDER_MANAGER', _('Tender Manager')
    VENDOR = 'VENDOR', _('Vendor')
    EVALUATOR = 'EVALUATOR', _('Evaluator')
    AUDITOR = 'AUDITOR', _('Auditor')


class UserStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    SUSPENDED = 'SUSPENDED', _('Suspended')
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', _('Pending Verification')
    DEACTIVATED = 'DEACTIVATED', _('Deactivated')


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    org_type = models.CharField(max_length=50, default='ENTERPRISE')
    tax_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments', null=True, blank=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.organization.name if self.organization else 'Global'})"


class PermissionCategory(models.TextChoices):
    TENDER = 'Tender Management', _('Tender Management')
    BID = 'Bid Management', _('Bid Management')
    REPORTS = 'Reports & Analytics', _('Reports & Analytics')
    USERS = 'User Management', _('User Management')
    SYSTEM = 'System Settings', _('System Settings')


class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=PermissionCategory.choices, default=PermissionCategory.TENDER)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['category', 'code']

    def __str__(self):
        return f"[{self.category}] {self.name} ({self.code})"


class RolePermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=30, choices=UserRole.choices)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role} -> {self.permission.code}"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.VENDOR,
        help_text=_('Designated Role-Based Access Control (RBAC) role')
    )
    status = models.CharField(
        max_length=30,
        choices=UserStatus.choices,
        default=UserStatus.ACTIVE
    )
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department_name = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    position_title = models.CharField(max_length=150, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    
    is_email_verified = models.BooleanField(default=False)
    is_mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=64, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.username

    @property
    def effective_organization_name(self):
        if self.organization:
            return self.organization.name
        return self.organization_name or 'Unassigned'

    @property
    def effective_department_name(self):
        if self.department:
            return self.department.name
        return self.department_name or 'General'

    @property
    def profile_completion_rate(self):
        fields = [self.first_name, self.last_name, self.email, self.phone_number, self.position_title, self.organization_name or self.organization, self.department_name or self.department]
        completed = sum(1 for f in fields if f)
        return int((completed / len(fields)) * 100)


class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_token_jti = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    device_type = models.CharField(max_length=50, default='Browser Session')
    location = models.CharField(max_length=100, default='Primary Office')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_activity']

    def __str__(self):
        return f"Session for {self.user.email} from {self.ip_address or 'Unknown IP'}"


class ActivityStatus(models.TextChoices):
    SUCCESS = 'SUCCESS', _('Success')
    FAILED = 'FAILED', _('Failed')
    WARNING = 'WARNING', _('Warning')


class UserActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=100)
    resource = models.CharField(max_length=255, blank=True, null=True)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=ActivityStatus.choices, default=ActivityStatus.SUCCESS)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.status}] {self.user.email} - {self.action} at {self.timestamp}"


class LoginAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    was_successful = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=255, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"LoginAttempt: {self.email} ({'Success' if self.was_successful else 'Failed'}) at {self.timestamp}"


class EmailVerificationToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_tokens')
    token = models.CharField(max_length=128, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Email token for {self.user.email}"


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_tokens')
    token = models.CharField(max_length=128, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Password reset token for {self.user.email}"

