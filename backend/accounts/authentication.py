from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser

class SafeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that safely handles invalid, expired, or stale tokens.
    If an Authorization Bearer header is present but invalid/expired/user not found:
    - Instead of throwing an immediate 401 AuthenticationFailed exception before permission checks,
      it returns None (AnonymousUser).
    - If the target view permits AllowAny, the view executes successfully with public data.
    - If the target view requires IsAuthenticated, DRF permission checks will enforce HTTP 401.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            if not user or getattr(user, 'is_deleted', False):
                return None
            return user, validated_token
        except Exception:
            return None
