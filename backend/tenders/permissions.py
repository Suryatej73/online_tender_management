try:
    from rest_framework.permissions import BasePermission, SAFE_METHODS
except ImportError:
    class BasePermission: pass
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

from accounts.models import UserRole
from .models import TenderStatus


class IsTenderManagerOrAdmin(BasePermission):
    """Allows write/management access only to Super Admins, Org Admins, and Tender Managers."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]
        )


class CanViewTender(BasePermission):
    """Public read access for Published/Active tenders; Restricted for Drafts."""
    def has_object_permission(self, request, view, obj):
        if obj.status in [TenderStatus.PUBLISHED, TenderStatus.ACTIVE, TenderStatus.EVALUATION, TenderStatus.AWARDED, TenderStatus.CLOSED]:
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER, UserRole.AUDITOR]
        )


class CanEditTender(BasePermission):
    """Only DRAFT tenders can be edited by authorized Tender Managers or Admins."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if obj.status != TenderStatus.DRAFT:
            return False
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]
        )
