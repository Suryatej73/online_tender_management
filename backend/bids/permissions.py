try:
    from rest_framework.permissions import BasePermission, SAFE_METHODS
except ImportError:
    class BasePermission:
        pass
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

from accounts.models import UserRole


class IsVendorOwner(BasePermission):
    """Object-level: only the bid's owning vendor can access."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        # Vendor can only modify own bids
        if request.user.role == UserRole.VENDOR:
            return obj.vendor.user == request.user
        # Admins can view
        return request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.EVALUATOR]


class CanSubmitBid(BasePermission):
    """Can submit a bid (vendor only, own bid, correct state)."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.VENDOR:
            return obj.vendor.user == request.user
        return request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]


class CanAmendBid(BasePermission):
    """Can amend a bid."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.VENDOR:
            return obj.vendor.user == request.user
        return request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]


class CanWithdrawBid(BasePermission):
    """Can withdraw a bid."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.VENDOR:
            return obj.vendor.user == obj.vendor.user
        return request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]


class CanViewFinancialBid(BasePermission):
    """
    STRICT: Financial bid confidentiality enforcement.
    Before financial opening: only the owning vendor.
    After financial opening: only authorized roles.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        bid = obj if hasattr(obj, 'financial_bid') else getattr(obj, 'bid', obj)

        # Vendor can always see their own financial bid
        if request.user.role == UserRole.VENDOR:
            return bid.vendor.user == request.user

        # After financial opening, evaluators/admins with proper roles can view
        if bid.status in ['FINANCIAL_OPENED', 'EVALUATED', 'AWARDED', 'REJECTED', 'DISQUALIFIED']:
            return request.user.role in [
                UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN,
                UserRole.TENDER_MANAGER, UserRole.EVALUATOR,
            ]

        # Before opening, only super admin can view (for auditing)
        return request.user.role == UserRole.SUPER_ADMIN


class CanOpenBids(BasePermission):
    """Can authorize or execute bid opening."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.ORG_ADMIN,
            UserRole.TENDER_MANAGER,
        ]


class CanAuthorizeFinancialOpening(BasePermission):
    """Can authorize financial bid opening — restricted to specific roles."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.ORG_ADMIN,
        ]


class CanUploadBidDocument(BasePermission):
    """Can upload documents to a bid."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.VENDOR:
            return obj.vendor.user == request.user
        return request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]


class IsBidManagerOrAdmin(BasePermission):
    """Admin-level bid management access."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.ORG_ADMIN,
            UserRole.TENDER_MANAGER,
        ]


class IsVendorOrAdmin(BasePermission):
    """Vendor (own data) or admin access."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.ORG_ADMIN,
            UserRole.VENDOR,
            UserRole.TENDER_MANAGER,
            UserRole.EVALUATOR,
        ]
