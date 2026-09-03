try:
    from rest_framework.permissions import BasePermission, SAFE_METHODS
except ImportError:
    class BasePermission: pass
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

from documents.services.access import DocumentAccessService


class DocumentPermission(BasePermission):
    """Checks general authenticated status and role privileges."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return DocumentAccessService.can_view_document(request.user, obj)
        return DocumentAccessService.can_edit_or_delete_document(request.user, obj)
