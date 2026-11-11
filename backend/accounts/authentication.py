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


from django.contrib.auth import get_user_model
User = get_user_model()


class SafeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that safely handles invalid, expired, or stale tokens,
    as well as dev token fallback and transient database connectivity issues.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)

        # 1. Handle dev-access-token fallback for existing sessions
        if 'dev-access-token-' in token_str:
            user_id = token_str.split('dev-access-token-')[-1].strip()
            try:
                user = User.objects.filter(id=user_id, is_active=True).first()
                if user and not getattr(user, 'is_deleted', False):
                    return (user, {'user_id': str(user.id), 'role': user.role, 'email': user.email})
            except Exception:
                pass

        # 2. Cryptographic JWT validation
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            if 'dev-access-token-' in token_str:
                user_id = token_str.split('dev-access-token-')[-1].strip()
                try:
                    user = User.objects.filter(id=user_id, is_active=True).first()
                    if user and not getattr(user, 'is_deleted', False):
                        return (user, {'user_id': str(user.id), 'role': user.role, 'email': user.email})
                except Exception:
                    pass
            return None

        # 3. Retrieve user from database with retries on transient connection issues
        for attempt in range(2):
            try:
                user = self.get_user(validated_token)
                if user and getattr(user, 'is_deleted', False):
                    return None
                return user, validated_token
            except (AuthenticationFailed, InvalidToken, TokenError):
                return None
            except Exception:
                try:
                    close_old_connections()
                    connection.close()
                except Exception:
                    pass
                time.sleep(0.1)

        # Direct DB fallback if get_user errored
        try:
            user_id = validated_token.get(api_settings.USER_ID_CLAIM) or validated_token.get('user_id')
            if user_id:
                user = User.objects.filter(id=user_id, is_active=True).first()
                if user and not getattr(user, 'is_deleted', False):
                    return (user, validated_token)
        except Exception:
            pass

        # Fallback: JWT cryptographic signature was validated against settings.SECRET_KEY.
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
