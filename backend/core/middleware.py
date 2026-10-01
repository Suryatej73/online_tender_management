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
