try:
    from rest_framework.permissions import BasePermission
except ImportError:
    class BasePermission:
        pass

from .models import UserRole



class IsSuperAdmin(BasePermission):
    """Allows access only to Super Admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.SUPER_ADMIN
        )


class IsOrgAdmin(BasePermission):
    """Allows access to Super Admins and Organization Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]
        )


class IsTenderManager(BasePermission):
    """Allows access to Super Admins, Org Admins, and Tender Managers."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]
        )


class IsVendor(BasePermission):
    """Allows access only to Vendor users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.VENDOR
        )


class IsEvaluator(BasePermission):
    """Allows access to Evaluators, Tender Managers, and Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER, UserRole.EVALUATOR]
        )


class IsAuditor(BasePermission):
    """Allows access to Auditors, Super Admins, and Org Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.AUDITOR]
        )


def HasRole(*allowed_roles):
    """Factory creating custom permission class for specific allowed roles."""
    class CustomRolePermission(BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user and 
                request.user.is_authenticated and 
                request.user.role in allowed_roles
            )
    return CustomRolePermission
