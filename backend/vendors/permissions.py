try:
    from rest_framework.permissions import BasePermission, SAFE_METHODS
except ImportError:
    class BasePermission:
        pass
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

from accounts.models import UserRole


class IsAdminOnly(BasePermission):
    """Only Super Admin and Org Admin can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]
        )


class IsVendorUser(BasePermission):
    """Only Vendor role users can access."""
    def has_permission(self, request, request_view=None):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.VENDOR
        )


class IsVendorOrAdmin(BasePermission):
    """Vendors (own data) or Admins (any data)."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.VENDOR]
        )


class IsAdminOrReadOnly(BasePermission):
    """Admins can write; authenticated users can read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]
        )


class IsOrganizationOrAdmin(BasePermission):
    """Organization users and admins can rate/review vendors."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [
                UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN,
                UserRole.TENDER_MANAGER, UserRole.EVALUATOR,
            ]
        )


def has_vendor_permission(user, vendor):
    """Check if user has permission to access a specific vendor's data."""
    if not user or not user.is_authenticated:
        return False
    if user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        return True
    if user.role == UserRole.VENDOR and vendor.user == user:
        return True
    # Organization users can view verified vendors
    if user.role in [UserRole.TENDER_MANAGER, UserRole.EVALUATOR]:
        return vendor.status == 'VERIFIED'
    return False
