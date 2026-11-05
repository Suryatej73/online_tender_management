import time
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser
from django.db import connection, close_old_connections


class AuthenticatedTokenUser:
    """
    Lightweight verified user constructed from cryptographically validated JWT claims.
    Used when the database connection drops or experiences temporary network timeouts
    (such as transient Supabase pooler latency over campus Wi-Fi), ensuring that a legitimately
    authenticated Tender Manager or Admin is never falsely rejected with 'Authentication credentials not provided'.
    """
    is_authenticated = True
    is_anonymous = False
    is_active = True

    def __init__(self, user_id, role, email, full_name='', organization=None):
        self.id = user_id
        self.pk = user_id
        self.role = role
        self.email = email
        self.username = email
        self.full_name = full_name or email
        self.organization = organization
        self.is_staff = (role == 'SUPER_ADMIN')
        self.is_superuser = (role == 'SUPER_ADMIN')

    def __str__(self):
        return f"{self.email} ({self.role}) [TokenUser]"

    def has_perm(self, perm, obj=None):
        return True

    def has_perms(self, perm_list, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

    def save(self, *args, **kwargs):
        pass


class SafeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that safely handles invalid, expired, or stale tokens,
    while remaining fully resilient to transient database connectivity issues.
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
        except Exception:
            return None

        # Attempt to retrieve user from database with retries on transient connection issues
        for attempt in range(2):
            try:
                user = self.get_user(validated_token)
                if user and getattr(user, 'is_deleted', False):
                    return None
                return user, validated_token
            except (AuthenticationFailed, InvalidToken, TokenError):
                # Genuinely invalid or inactive user in database
                return None
            except Exception:
                # Transient OperationalError or database connection timeout to Supabase pooler
                try:
                    close_old_connections()
                    connection.close()
                except Exception:
                    pass
                time.sleep(0.2)

        # Fallback: JWT cryptographic signature was validated against settings.SECRET_KEY.
        # Construct an AuthenticatedTokenUser so valid requests are not rejected with 401.
        try:
            user_id = validated_token.get(api_settings.USER_ID_CLAIM) or validated_token.get('user_id')
            role = validated_token.get('role') or 'VENDOR'
            email = validated_token.get('email') or ''
            full_name = validated_token.get('full_name') or ''
            if user_id:
                fallback_user = AuthenticatedTokenUser(
                    user_id=user_id,
                    role=role,
                    email=email,
                    full_name=full_name
                )
                return fallback_user, validated_token
        except Exception:
            pass

        return None


try:
    from rest_framework.authentication import SessionAuthentication

    class CsrfExemptSessionAuthentication(SessionAuthentication):
        """
        SessionAuthentication without CSRF enforcement for REST API callers.
        """
        def enforce_csrf(self, request):
            return  # To not perform CSRF check
except ImportError:
    class CsrfExemptSessionAuthentication:
        pass
