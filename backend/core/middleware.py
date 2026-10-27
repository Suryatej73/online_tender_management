from django.utils.deprecation import MiddlewareMixin

class ApiCsrfExemptMiddleware(MiddlewareMixin):
    """
    Exempt all /api/ routes from CSRF verification.
    TenderX uses stateless JWT tokens (Authorization: Bearer <token>) for API authentication,
    making CSRF tokens unnecessary and preventing HTTP 403 Forbidden errors when frontend
    origin (e.g. http://localhost:5173) makes cross-origin or proxied API requests.
    """
    def process_request(self, request):
        path = getattr(request, 'path_info', getattr(request, 'path', ''))
        if path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

    def process_view(self, request, view_func, view_args, view_kwargs):
        path = getattr(request, 'path_info', getattr(request, 'path', ''))
        if path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

    def process_exception(self, request, exception):
        path = getattr(request, 'path_info', getattr(request, 'path', ''))
        if path.startswith('/api/'):
            from django.http import JsonResponse
            from django.db import DatabaseError
            import logging
            logging.getLogger('tenderx.api').error(f"Unhandled API error on {path}: {str(exception)}", exc_info=True)
            if isinstance(exception, DatabaseError):
                status_code = 503
                message = 'The data service is temporarily unavailable. Please try again shortly.'
            elif isinstance(exception, (ValueError, KeyError, TypeError)):
                status_code = 400
                message = 'The request contains invalid data.'
            else:
                status_code = 500
                message = 'An unexpected server error occurred.'
            return JsonResponse({
                "success": False,
                "message": message,
            }, status=status_code)
        return None
