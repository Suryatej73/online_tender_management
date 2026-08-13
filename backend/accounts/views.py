import uuid
import datetime
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model

try:
    from rest_framework.views import APIView
    from rest_framework.response import Response
    from rest_framework import status, permissions
except ImportError:
    from django.views import View
    from django.http import JsonResponse

    class APIView(View):
        def dispatch(self, request, *args, **kwargs):
            handler = getattr(self, request.method.lower(), None)
            if handler:
                return handler(request, *args, **kwargs)
            return JsonResponse({'error': 'Method not allowed'}, status=405)

    def Response(data, status=200):
        return JsonResponse(data, status=status)

    class permissions:
        class AllowAny: pass
        class IsAuthenticated: pass

    class status:
        HTTP_200_OK = 200
        HTTP_201_CREATED = 201
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404

try:
    import pyotp
    import qrcode
    import io
    import base64
    MFA_AVAILABLE = True
except ImportError:
    MFA_AVAILABLE = False

from .models import UserRole, UserSession, EmailVerificationToken, PasswordResetToken
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, MFALoginSerializer,
    MFASetupVerifySerializer, EmailVerificationSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, UserSessionSerializer
)
from .permissions import IsSuperAdmin, IsOrgAdmin

User = get_user_model()


def get_request_data(request):
    if hasattr(request, 'data'):
        return request.data
    import json
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return {}


def get_tokens_for_user(user):
    """Generate JWT Access and Refresh token pair for a user with role claim."""
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['full_name'] = user.full_name
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'jti': str(refresh.payload.get('jti', ''))
        }
    except Exception:
        jti = str(uuid.uuid4())
        return {
            'refresh': f'dev-refresh-token-{user.id}',
            'access': f'dev-access-token-{user.id}',
            'jti': jti
        }



def record_user_session(user, request, refresh_jti):
    """Record active user login session."""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    user_agent = request.META.get('HTTP_USER_AGENT', 'Browser Agent')
    
    UserSession.objects.create(
        user=user,
        refresh_token_jti=refresh_jti or str(uuid.uuid4()),
        ip_address=ip,
        user_agent=user_agent,
        device_type="Desktop Browser" if "Mobi" not in user_agent else "Mobile Device",
        is_active=True
    )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Create Email Verification Token (Expires in 24h)
            verification_token = str(uuid.uuid4())
            EmailVerificationToken.objects.create(
                user=user,
                token=verification_token,
                expires_at=timezone.now() + datetime.timedelta(hours=24)
            )

            tokens = get_tokens_for_user(user)
            record_user_session(user, request, tokens['jti'])

            return Response({
                "message": "User registered successfully!",
                "verification_token": verification_token,
                "tokens": tokens,
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = LoginSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email', data.get('email'))
        password = serializer.validated_data.get('password', data.get('password'))

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({"error": "Invalid email address or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.is_mfa_enabled:
            return Response({
                "mfa_required": True,
                "message": "Multi-Factor Authentication required. Enter TOTP code.",
                "user_id": str(user.id)
            }, status=status.HTTP_200_OK)

        tokens = get_tokens_for_user(user)
        record_user_session(user, request, tokens['jti'])

        return Response({
            "mfa_required": False,
            "message": "Login successful!",
            "tokens": tokens,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class MFALoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = MFALoginSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_id = serializer.validated_data.get('user_id', data.get('user_id'))
        totp_code = serializer.validated_data.get('totp_code', data.get('totp_code'))

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user.is_mfa_enabled or not user.mfa_secret:
            return Response({"error": "MFA is not configured for this account."}, status=status.HTTP_400_BAD_REQUEST)

        is_valid = False
        if MFA_AVAILABLE:
            totp = pyotp.TOTP(user.mfa_secret)
            is_valid = totp.verify(totp_code)
        else:
            # Fallback for dev testing when pyotp isn't available
            is_valid = (totp_code == "123456" or totp_code == user.mfa_secret[:6])

        if not is_valid:
            return Response({"error": "Invalid Multi-Factor Authentication code."}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        record_user_session(user, request, tokens['jti'])

        return Response({
            "message": "MFA Authentication successful!",
            "tokens": tokens,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = EmailVerificationSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data.get('token', data.get('token'))
        try:
            token_obj = EmailVerificationToken.objects.get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            return Response({"error": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)

        if not token_obj.is_valid():
            return Response({"error": "Token has expired or already been used."}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.is_email_verified = True
        user.save()

        token_obj.is_used = True
        token_obj.save()

        return Response({
            "message": "Email address successfully verified!",
            "email": user.email
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = PasswordResetRequestSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email', data.get('email'))
        try:
            user = User.objects.get(email=email)
            reset_token = str(uuid.uuid4())
            PasswordResetToken.objects.create(
                user=user,
                token=reset_token,
                expires_at=timezone.now() + datetime.timedelta(hours=1)
            )
            return Response({
                "message": "Password reset link generated.",
                "reset_token": reset_token
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({
                "message": "If an account exists with this email, a reset token has been issued.",
            }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        serializer = PasswordResetConfirmSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data.get('token', data.get('token'))
        new_password = serializer.validated_data.get('new_password', data.get('new_password'))

        try:
            token_obj = PasswordResetToken.objects.get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST)

        if not token_obj.is_valid():
            return Response({"error": "Token has expired or already been used."}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(new_password)
        user.save()

        token_obj.is_used = True
        token_obj.save()

        return Response({"message": "Password has been reset successfully. You can now log in."}, status=status.HTTP_200_OK)



class MFASetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if MFA_AVAILABLE:
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            qr_uri = totp.provisioning_uri(name=user.email, issuer_name="tenderX")
            
            # Generate QR Code image as base64 data URL
            qr_img = qrcode.make(qr_uri)
            buffer = io.BytesIO()
            qr_img.save(buffer, format="PNG")
            qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            qr_code_url = f"data:image/png;base64,{qr_base64}"
        else:
            secret = "JBSWY3DPEHPK3PXP"
            qr_code_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        user.mfa_secret = secret
        user.save()

        return Response({
            "mfa_secret": secret,
            "qr_code_url": qr_code_url,
            "instructions": "Scan the QR code in Google Authenticator or enter the secret key manually, then verify a 6-digit TOTP code."
        }, status=status.HTTP_200_OK)


class MFAVerifySetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MFASetupVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        totp_code = serializer.validated_data['totp_code']
        user = request.user

        if not user.mfa_secret:
            return Response({"error": "Call MFA setup first to generate secret key."}, status=status.HTTP_400_BAD_REQUEST)

        is_valid = False
        if MFA_AVAILABLE:
            totp = pyotp.TOTP(user.mfa_secret)
            is_valid = totp.verify(totp_code)
        else:
            is_valid = (totp_code == "123456" or len(totp_code) == 6)

        if not is_valid:
            return Response({"error": "Invalid TOTP code."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_mfa_enabled = True
        user.save()

        return Response({
            "message": "Multi-Factor Authentication (MFA) successfully enabled for your account!",
            "is_mfa_enabled": True
        }, status=status.HTTP_200_OK)


class UserSessionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SessionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        revoke_all = request.data.get('revoke_all', False)

        if revoke_all:
            UserSession.objects.filter(user=request.user).update(is_active=False)
            return Response({"message": "All sessions revoked successfully."}, status=status.HTTP_200_OK)

        if session_id:
            UserSession.objects.filter(user=request.user, id=session_id).update(is_active=False)
            return Response({"message": "Session revoked successfully."}, status=status.HTTP_200_OK)

        return Response({"error": "Specify session_id or set revoke_all=true."}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserListView(APIView):
    permission_classes = [IsSuperAdmin | IsOrgAdmin]

    def get(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response({
            "count": users.count(),
            "users": serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request)
        user_id = data.get('user_id')
        new_role = data.get('role')

        if not user_id or new_role not in UserRole.values:
            return Response({"error": "Valid user_id and role required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
            target_user.role = new_role
            target_user.save()
            return Response({
                "message": f"Updated role for {target_user.email} to {target_user.get_role_display()}",
                "user": UserSerializer(target_user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

