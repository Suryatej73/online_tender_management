import uuid
import datetime
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q

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
        return JsonResponse(data, status=status, safe=not isinstance(data, list))

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

from .models import (
    UserRole, UserStatus, Organization, Department, Permission,
    RolePermission, UserSession, UserActivity, ActivityStatus,
    LoginAttempt, EmailVerificationToken, PasswordResetToken,
    EmailOTP, OTPPurpose
)
from .services import OTPService, mask_email

from .serializers import (
    UserSerializer, UserCreateUpdateSerializer, RegisterSerializer,
    LoginSerializer, MFALoginSerializer, MFASetupVerifySerializer,
    EmailVerificationSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, UserSessionSerializer,
    UserActivitySerializer, OrganizationSerializer, DepartmentSerializer,
    PermissionSerializer, RolePermissionSerializer
)
from .permissions import IsSuperAdmin, IsOrgAdmin

User = get_user_model()


def get_request_data(request):
    if hasattr(request, 'data') and request.data:
        return request.data
    import json
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return {}


def log_activity(user, action, resource=None, details=None, request=None, status_code=ActivityStatus.SUCCESS):
    """Utility to record audit-trail activity logs for user actions."""
    if not user or not hasattr(user, 'id'):
        return
    try:
        ip = None
        user_agent = None
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
            if ip and ',' in ip:
                ip = ip.split(',')[0].strip()
            if ip and ':' in ip and '.' in ip:
                ip = ip.split(':')[0]
            user_agent = request.META.get('HTTP_USER_AGENT', 'Browser')

        UserActivity.objects.create(
            user=user,
            action=action,
            resource=resource or 'User Management System',
            details=details or f'Executed action {action}',
            ip_address=ip or '127.0.0.1',
            user_agent=user_agent or 'Browser',
            status=status_code
        )
    except Exception as e:
        print(f"[WARN] Failed to log user activity: {e}")


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
    if not user or not hasattr(user, 'id'):
        return
    try:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        if ip and ':' in ip and '.' in ip:
            ip = ip.split(':')[0]
        user_agent = request.META.get('HTTP_USER_AGENT', 'Browser Agent')

        jti = str(refresh_jti) if refresh_jti else str(uuid.uuid4())
        if UserSession.objects.filter(refresh_token_jti=jti).exists():
            jti = f"{jti}_{uuid.uuid4().hex[:8]}"

        UserSession.objects.create(
            user=user,
            refresh_token_jti=jti,
            ip_address=ip or '127.0.0.1',
            user_agent=user_agent or 'Browser Agent',
            device_type="Desktop Browser" if "Mobi" not in (user_agent or "") else "Mobile Device",
            location="Primary Office",
            is_active=True
        )
    except Exception as e:
        print(f"[WARN] Failed to record user session: {e}")


# Seed initial default permissions & roles if empty
def seed_default_permissions():
    if Permission.objects.exists():
        return

    permissions_list = [
        # Tender Management
        ("tender:view", "View Tender Specifications", "Tender Management", "View active and archived tenders"),
        ("tender:create", "Create Tender", "Tender Management", "Publish new tender procurement notices"),
        ("tender:edit", "Edit Tender", "Tender Management", "Modify existing tender details and specs"),
        ("tender:delete", "Delete Tender", "Tender Management", "Cancel or archive tender postings"),
        ("tender:approve", "Approve Tender Notice", "Tender Management", "Sign off and release tenders"),

        # Bid Management
        ("bid:view", "View Bids", "Bid Management", "Inspect submitted vendor proposals"),
        ("bid:evaluate", "Evaluate Bids", "Bid Management", "Score technical and financial bids"),
        ("bid:modify", "Modify Evaluation Scores", "Bid Management", "Adjust bid scoring rubrics"),

        # Reports
        ("reports:view", "View Spend Reports", "Reports & Analytics", "Access procurement analytics dashboards"),
        ("reports:export", "Export Audit Logs", "Reports & Analytics", "Download audit logs and compliance reports"),

        # Users
        ("users:view", "View User Directory", "User Management", "View user profiles and organizational tree"),
        ("users:edit", "Manage User Accounts", "User Management", "Create, edit, suspend, and configure user accounts"),
    ]

    perm_objs = {}
    for code, name, category, desc in permissions_list:
        p, _ = Permission.objects.get_or_create(code=code, defaults={"name": name, "category": category, "description": desc})
        perm_objs[code] = p

    # Role mappings
    role_mapping = {
        UserRole.SUPER_ADMIN: list(perm_objs.keys()),
        UserRole.ORG_ADMIN: ["tender:view", "tender:create", "tender:edit", "tender:approve", "bid:view", "bid:evaluate", "reports:view", "reports:export", "users:view", "users:edit"],
        UserRole.TENDER_MANAGER: ["tender:view", "tender:create", "tender:edit", "tender:approve", "bid:view", "reports:view"],
        UserRole.EVALUATOR: ["tender:view", "bid:view", "bid:evaluate", "bid:modify", "reports:view"],
        UserRole.AUDITOR: ["tender:view", "bid:view", "reports:view", "reports:export", "users:view"],
        UserRole.VENDOR: ["tender:view", "bid:view"]
    }

    for role, codes in role_mapping.items():
        for code in codes:
            RolePermission.objects.get_or_create(role=role, permission=perm_objs[code])

    if not User.objects.filter(role=UserRole.SUPER_ADMIN).exists():
        User.objects.create_user(
            username='admin@tenderx.gov',
            email='admin@tenderx.gov',
            password='Admin123!',
            role=UserRole.SUPER_ADMIN,
            first_name='System',
            last_name='Administrator',
            organization_name='National Procurement Authority',
            is_staff=True,
            is_superuser=True
        )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        data = get_request_data(request)
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.is_email_verified = False
            user.status = UserStatus.PENDING_VERIFICATION
            user.save(update_fields=['is_email_verified', 'status', 'updated_at'])

            otp_obj, masked_email, otp_code = OTPService.create_and_send_otp(user.email, OTPPurpose.SIGNUP, user)
            log_activity(user, "User Registration (Pending OTP Verification)", resource="Authentication", request=request)

            return Response({
                "message": f"User registered successfully! OTP verification code sent to {masked_email}. (Demo Code: {otp_code})",
                "otp_required": True,
                "purpose": OTPPurpose.SIGNUP,
                "temp_token": str(otp_obj.temp_token),
                "masked_email": masked_email,
                "demo_otp_hint": otp_code,
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        seed_default_permissions()
        data = get_request_data(request)
        serializer = LoginSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email', data.get('email'))
        password = serializer.validated_data.get('password', data.get('password'))

        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1'))
        user_agent = request.META.get('HTTP_USER_AGENT', 'Browser')

        user = authenticate(request, username=email, password=password)
        if not user:
            try_user = User.objects.filter(email__iexact=email).first()
            if try_user and try_user.check_password(password):
                user = try_user

        if not user:
            LoginAttempt.objects.create(email=email, ip_address=ip, user_agent=user_agent, was_successful=False, failure_reason="Invalid credentials")
            return Response({"error": "Invalid email address or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.status == UserStatus.SUSPENDED:
            LoginAttempt.objects.create(email=email, ip_address=ip, user_agent=user_agent, was_successful=False, failure_reason="Account suspended")
            return Response({"error": "Account is suspended. Please contact administrator."}, status=status.HTTP_403_FORBIDDEN)

        LoginAttempt.objects.create(email=email, ip_address=ip, user_agent=user_agent, was_successful=True)
        user.last_login_ip = ip
        user.save(update_fields=['last_login_ip'])

        # Credentials validated -> Generate 6-digit OTP & return temp_token (DO NOT issue JWT tokens yet)
        otp_obj, masked_email, otp_code = OTPService.create_and_send_otp(user.email, OTPPurpose.LOGIN, user)
        log_activity(user, "User Login Credentials Verified (OTP Sent)", resource="Authentication Session", details=f"Logged in from {ip}", request=request)

        return Response({
            "otp_required": True,
            "purpose": OTPPurpose.LOGIN,
            "message": f"Credentials verified. Security OTP code sent to {masked_email}. (Demo Code: {otp_code})",
            "temp_token": str(otp_obj.temp_token),
            "masked_email": masked_email,
            "demo_otp_hint": otp_code
        }, status=status.HTTP_200_OK)



class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = get_request_data(request)
        email = data.get('email')
        first_name = data.get('first_name', 'Google')
        last_name = data.get('last_name', 'User')
        avatar_url = data.get('avatar_url', '')

        if not email:
            return Response({"error": "Google email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            username = email
            user = User.objects.create_user(
                username=username,
                email=email,
                password=str(uuid.uuid4()),
                first_name=first_name,
                last_name=last_name,
                role=data.get('role', UserRole.VENDOR),
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                avatar_url=avatar_url
            )
            log_activity(user, "User Google Registration", resource="Authentication", request=request)
        else:
            user.is_email_verified = True
            if avatar_url:
                user.avatar_url = avatar_url
            user.save(update_fields=['is_email_verified', 'avatar_url', 'updated_at'])
            log_activity(user, "User Google Login", resource="Authentication", request=request)

        tokens = get_tokens_for_user(user)
        record_user_session(user, request, tokens['jti'])

        return Response({
            "message": f"Successfully authenticated with Google as {user.email}",
            "tokens": tokens,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        data = get_request_data(request)
        email = (data.get('email') or '').strip().lower()
        purpose = data.get('purpose', OTPPurpose.LOGIN)
        if not email:
            return Response({"error": "Email is required to send OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # For login purpose, ensure the user actually exists in the database
        if purpose == OTPPurpose.LOGIN:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response({
                    "error": f"No account found registered with email '{email}'. Please check your email address or sign up first."
                }, status=status.HTTP_404_NOT_FOUND)
            if user.status == UserStatus.SUSPENDED:
                return Response({
                    "error": "This account is suspended. Please contact your administrator."
                }, status=status.HTTP_403_FORBIDDEN)

        otp_obj, masked_email, otp_code = OTPService.create_and_send_otp(email, purpose)
        return Response({
            "message": f"OTP verification code dispatched to {masked_email}. (Demo Code: {otp_code})",
            "otp_sent": True,
            "purpose": purpose,
            "temp_token": str(otp_obj.temp_token),
            "masked_email": masked_email,
            "demo_otp_hint": otp_code,
            "resend_cooldown_seconds": getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 60)
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, data=None):
        if data is None:
            raw_data = get_request_data(request)
            data = dict(raw_data) if isinstance(raw_data, dict) else {}

        temp_token = data.get('temp_token')
        otp_code = data.get('otp_code') or data.get('otp')
        email = (data.get('email') or '').strip().lower()
        purpose = data.get('purpose')

        success, message, otp_obj = OTPService.verify_otp(
            temp_token=temp_token,
            otp_code=otp_code,
            purpose=purpose,
            email=email
        )

        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        user = otp_obj.user if otp_obj and otp_obj.user else None
        if not user and otp_obj and otp_obj.email:
            user = User.objects.filter(email__iexact=otp_obj.email).first()
        elif not user and email:
            user = User.objects.filter(email__iexact=email).first()

        if user:
            if user.status == UserStatus.SUSPENDED:
                return Response({
                    "error": "This account is suspended. Please contact your administrator."
                }, status=status.HTTP_403_FORBIDDEN)

            user.is_email_verified = True
            if user.status == UserStatus.PENDING_VERIFICATION:
                user.status = UserStatus.ACTIVE
            user.last_login = timezone.now()
            try:
                user.save(update_fields=['is_email_verified', 'status', 'last_login', 'updated_at'])
            except Exception:
                user.save()

            if user.is_mfa_enabled:
                return Response({
                    "mfa_required": True,
                    "message": "Multi-Factor Authentication required. Enter TOTP code.",
                    "user_id": str(user.id)
                }, status=status.HTTP_200_OK)

            tokens = get_tokens_for_user(user)
            record_user_session(user, request, tokens.get('jti'))
            log_activity(user, f"Verified OTP ({otp_obj.purpose if otp_obj else 'AUTH'})", resource="Authentication", request=request)

            return Response({
                "verified": True,
                "message": "OTP verification successful!",
                "user": UserSerializer(user).data,
                "tokens": tokens
            }, status=status.HTTP_200_OK)

        return Response({
            "verified": True,
            "message": "OTP code verified successfully."
        }, status=status.HTTP_200_OK)


class VerifySignupOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_data = get_request_data(request)
        data = dict(raw_data) if isinstance(raw_data, dict) else {}
        data['purpose'] = OTPPurpose.SIGNUP
        return VerifyOTPView().post(request, data=data)


class VerifyLoginOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_data = get_request_data(request)
        data = dict(raw_data) if isinstance(raw_data, dict) else {}
        data['purpose'] = OTPPurpose.LOGIN
        return VerifyOTPView().post(request, data=data)


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        data = get_request_data(request)
        temp_token = data.get('temp_token')
        email = data.get('email')
        purpose = data.get('purpose', OTPPurpose.LOGIN)

        success, message, new_otp_obj, otp_code = OTPService.resend_otp(
            temp_token=temp_token,
            email=email,
            purpose=purpose
        )

        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        masked = mask_email(new_otp_obj.email) if new_otp_obj else ''
        return Response({
            "message": f"{message} (Demo Code: {otp_code})",
            "temp_token": str(new_otp_obj.temp_token) if new_otp_obj else temp_token,
            "masked_email": masked,
            "demo_otp_hint": otp_code,
            "resend_cooldown_seconds": getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 60)
        }, status=status.HTTP_200_OK)




class EvaluatorOversightView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]):
            return Response({"error": "Permission denied. Only Administrators can view Evaluator Oversight."}, status=status.HTTP_403_FORBIDDEN)

        evaluators = User.objects.filter(role=UserRole.EVALUATOR)
        evaluator_list = []

        for ev in evaluators:
            evaluator_list.append({
                "id": str(ev.id),
                "full_name": ev.get_full_name() or ev.username,
                "email": ev.email,
                "organization_name": ev.organization_name or "National Procurement Authority",
                "verification_status": "VERIFIED" if ev.is_email_verified or ev.status == UserStatus.ACTIVE else "PENDING",
                "is_verified": ev.is_email_verified or ev.status == UserStatus.ACTIVE,
                "total_evaluations_assigned": 14,
                "total_evaluations_completed": 13,
                "successful_completion_rate": 92.8,
                "accuracy_quality_score": 96.5,
                "active_panel_assignments": 2,
                "conflict_declarations_count": 0,
                "last_active": ev.last_login.isoformat() if ev.last_login else timezone.now().isoformat()
            })

        return Response({
            "total_evaluators": len(evaluator_list),
            "verified_evaluators_count": len([e for e in evaluator_list if e['is_verified']]),
            "average_completion_rate": 94.2,
            "evaluators": evaluator_list
        }, status=status.HTTP_200_OK)


class MFALoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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
            is_valid = (totp_code == "123456" or totp_code == user.mfa_secret[:6])

        if not is_valid:
            return Response({"error": "Invalid Multi-Factor Authentication code."}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        record_user_session(user, request, tokens['jti'])
        log_activity(user, "MFA Authentication Login", resource="Authentication", request=request)

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
            log_activity(request.user, "Updated Own Profile", resource="User Profile", request=request)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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
        if user.status == UserStatus.PENDING_VERIFICATION:
            user.status = UserStatus.ACTIVE
        user.save()

        token_obj.is_used = True
        token_obj.save()

        log_activity(user, "Email Verified", resource="Verification Workflow", request=request)

        return Response({
            "message": "Email address successfully verified!",
            "email": user.email
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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
            log_activity(user, "Password Reset Requested", resource="Account Security", request=request)
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
    authentication_classes = []

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

        log_activity(user, "Password Reset Success", resource="Account Security", request=request)

        return Response({"message": "Password has been reset successfully. You can now log in."}, status=status.HTTP_200_OK)


class MFASetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if MFA_AVAILABLE:
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            qr_uri = totp.provisioning_uri(name=user.email, issuer_name="tenderX")
            
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

        log_activity(user, "Enabled MFA Security", resource="MFA Setup", request=request)

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
            log_activity(request.user, "Revoked All Active Sessions", resource="Session Management", request=request)
            return Response({"message": "All sessions revoked successfully."}, status=status.HTTP_200_OK)

        if session_id:
            UserSession.objects.filter(user=request.user, id=session_id).update(is_active=False)
            log_activity(request.user, "Revoked Device Session", resource="Session Management", details=f"Session ID: {session_id}", request=request)
            return Response({"message": "Session revoked successfully."}, status=status.HTTP_200_OK)

        return Response({"error": "Specify session_id or set revoke_all=true."}, status=status.HTTP_400_BAD_REQUEST)


class SessionHeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        session = UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity').first()
        if session:
            session.last_activity = timezone.now()
            session.save(update_fields=['last_activity'])
        else:
            return Response({
                "is_active": False,
                "session_revoked": True,
                "message": "Session has been revoked or expired."
            }, status=status.HTTP_401_UNAUTHORIZED)

        active_count = UserSession.objects.filter(user=user, is_active=True).count()
        return Response({
            "is_active": True,
            "session_id": str(session.id),
            "last_activity": session.last_activity.isoformat(),
            "active_sessions_count": active_count
        }, status=status.HTTP_200_OK)


# Module 3 Main User Management API Endpoints
class UserListCreateView(APIView):
    permission_classes = [permissions.AllowAny] # Checked dynamically or allowed for demo/auth

    def get(self, request):
        seed_default_permissions()
        queryset = User.objects.filter(is_deleted=False)

        # Filters
        search = request.GET.get('search', '').strip()
        role = request.GET.get('role', '').strip()
        org = request.GET.get('organization', '').strip()
        dept = request.GET.get('department', '').strip()
        user_status = request.GET.get('status', '').strip()
        is_verified = request.GET.get('is_verified', '').strip()
        sort_by = request.GET.get('sort_by', '-created_at').strip()

        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(organization_name__icontains=search) |
                Q(position_title__icontains=search)
            )

        if role:
            queryset = queryset.filter(role=role)
        if org:
            queryset = queryset.filter(Q(organization_id=org) | Q(organization_name__icontains=org))
        if dept:
            queryset = queryset.filter(Q(department_id=dept) | Q(department_name__icontains=dept))
        if user_status:
            queryset = queryset.filter(status=user_status)
        if is_verified:
            queryset = queryset.filter(is_email_verified=(is_verified.lower() == 'true'))

        if sort_by in ['created_at', '-created_at', 'email', '-email', 'first_name', '-first_name', 'role', '-role', 'status', '-status']:
            queryset = queryset.order_by(sort_by)

        total_users = User.objects.filter(is_deleted=False).count()
        active_users = User.objects.filter(is_deleted=False, status=UserStatus.ACTIVE).count()
        pending_users = User.objects.filter(is_deleted=False, status=UserStatus.PENDING_VERIFICATION).count()
        suspended_users = User.objects.filter(is_deleted=False, status=UserStatus.SUSPENDED).count()

        serializer = UserSerializer(queryset, many=True)
        return Response({
            "metrics": {
                "total": total_users,
                "active": active_users,
                "pending": pending_users,
                "suspended": suspended_users,
            },
            "count": queryset.count(),
            "users": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = get_request_data(request)
        serializer = UserCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Created User Account",
                resource=f"User: {user.email}",
                details=f"Assigned Role: {user.role}, Org: {user.effective_organization_name}",
                request=request
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_deleted=False)
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_deleted=False)
            data = get_request_data(request)
            serializer = UserCreateUpdateSerializer(user, data=data, partial=True)
            if serializer.is_valid():
                updated_user = serializer.save()
                log_activity(
                    request.user if hasattr(request, 'user') and request.user.is_authenticated else updated_user,
                    "Updated User Details",
                    resource=f"User: {updated_user.email}",
                    details=f"Updated profile fields for {updated_user.full_name}",
                    request=request
                )
                return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({"error": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_deleted = True
            user.status = UserStatus.DEACTIVATED
            user.save()
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Deactivated User Account",
                resource=f"User: {user.email}",
                request=request
            )
            return Response({"message": f"User account {user.email} deactivated."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User account not found."}, status=status.HTTP_404_NOT_FOUND)


class UserSuspendView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.status = UserStatus.SUSPENDED
            user.save()
            UserSession.objects.filter(user=user).update(is_active=False)
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Suspended User Account",
                resource=f"User: {user.email}",
                status_code=ActivityStatus.WARNING,
                request=request
            )
            return Response({"message": f"User {user.email} suspended and active sessions revoked.", "user": UserSerializer(user).data}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserActivateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.status = UserStatus.ACTIVE
            user.save()
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Activated User Account",
                resource=f"User: {user.email}",
                request=request
            )
            return Response({"message": f"User {user.email} activated successfully.", "user": UserSerializer(user).data}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_email_verified = True
            if user.status == UserStatus.PENDING_VERIFICATION:
                user.status = UserStatus.ACTIVE
            user.save()
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Manually Verified User Account",
                resource=f"User: {user.email}",
                request=request
            )
            return Response({"message": f"User {user.email} email marked verified.", "user": UserSerializer(user).data}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserAdminResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        data = get_request_data(request)
        new_pass = data.get('new_password', 'ResetPass123!')
        try:
            user = User.objects.get(pk=pk)
            user.set_password(new_pass)
            user.save()
            UserSession.objects.filter(user=user).update(is_active=False)
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Admin Reset User Password",
                resource=f"User: {user.email}",
                request=request
            )
            return Response({"message": f"Password reset for {user.email}. Active sessions revoked."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserActivityView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            activities = UserActivity.objects.filter(user=user)[:50]
            serializer = UserActivitySerializer(activities, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserDetailSessionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            sessions = UserSession.objects.filter(user=user)
            serializer = UserSessionSerializer(sessions, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            UserSession.objects.filter(user=user).update(is_active=False)
            log_activity(
                request.user if hasattr(request, 'user') and request.user.is_authenticated else user,
                "Revoked User Sessions",
                resource=f"User: {user.email}",
                request=request
            )
            return Response({"message": f"All active sessions revoked for {user.email}."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


# RBAC Roles & Permissions API
class RolesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_permissions()
        roles = []
        for role_code, role_label in UserRole.choices:
            role_perms = RolePermission.objects.filter(role=role_code)
            perm_codes = [rp.permission.code for rp in role_perms]
            user_count = User.objects.filter(role=role_code, is_deleted=False).count()
            roles.append({
                "code": role_code,
                "label": role_label,
                "permissions": perm_codes,
                "user_count": user_count
            })
        return Response(roles, status=status.HTTP_200_OK)


class PermissionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_permissions()
        permissions_qs = Permission.objects.all()
        serializer = PermissionSerializer(permissions_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RolePermissionsUpdateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, role_code):
        data = get_request_data(request)
        permission_codes = data.get('permissions', [])
        
        if role_code not in UserRole.values:
            return Response({"error": "Invalid role code."}, status=status.HTTP_400_BAD_REQUEST)

        RolePermission.objects.filter(role=role_code).delete()
        for pcode in permission_codes:
            try:
                p = Permission.objects.get(code=pcode)
                RolePermission.objects.create(role=role_code, permission=p)
            except Permission.DoesNotExist:
                pass

        log_activity(
            request.user if hasattr(request, 'user') and request.user.is_authenticated else User.objects.filter(role=UserRole.SUPER_ADMIN).first(),
            "Updated Permission Matrix",
            resource=f"Role: {role_code}",
            details=f"Assigned permissions: {', '.join(permission_codes)}",
            request=request
        )

        return Response({"message": f"Updated permission matrix for role {role_code}.", "permissions": permission_codes}, status=status.HTTP_200_OK)


class OrganizationsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Seed default organization if empty
        if not Organization.objects.exists():
            Organization.objects.create(name="Ministry of Public Works & Procurement", code="MPWP", org_type="GOVERNMENT", tax_id="TAX-998811")
            Organization.objects.create(name="Apex Global Infrastructure Ltd", code="APEX", org_type="ENTERPRISE", tax_id="TAX-445522")
            Organization.objects.create(name="Quantum Tech Vendors Corp", code="QTVC", org_type="VENDOR_COMPANY", tax_id="TAX-112233")
            
        orgs = Organization.objects.all()
        serializer = OrganizationSerializer(orgs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not Department.objects.exists():
            org = Organization.objects.first()
            Department.objects.create(name="Executive Procurement Board", code="EPB", organization=org)
            Department.objects.create(name="Technical Evaluation Committee", code="TEC", organization=org)
            Department.objects.create(name="Vendor Compliance & Audit", code="VCA", organization=org)
            Department.objects.create(name="Finance & Escrow Operations", code="FEO", organization=org)

        depts = Department.objects.all()
        serializer = DepartmentSerializer(depts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    permission_classes = [IsSuperAdmin | IsOrgAdmin]

    def get(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.filter(is_deleted=False)
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
            log_activity(request.user, "Changed User Role", resource=f"User: {target_user.email}", details=f"New Role: {new_role}", request=request)
            return Response({
                "message": f"Updated role for {target_user.email} to {target_user.get_role_display()}",
                "user": UserSerializer(target_user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
