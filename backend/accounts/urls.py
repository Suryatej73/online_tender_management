from django.urls import path
from .views import (
    RegisterView, LoginView, MFALoginView, UserProfileView, EmailVerifyView,
    PasswordResetRequestView, PasswordResetConfirmView, MFASetupView,
    MFAVerifySetupView, UserSessionsView, SessionRevokeView, AdminUserListView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('login/mfa/', MFALoginView.as_view(), name='auth_login_mfa'),
    path('me/', UserProfileView.as_view(), name='auth_me'),
    path('email/verify/', EmailVerifyView.as_view(), name='auth_email_verify'),
    path('password/reset-request/', PasswordResetRequestView.as_view(), name='auth_password_reset_request'),
    path('password/reset-confirm/', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('mfa/setup/', MFASetupView.as_view(), name='auth_mfa_setup'),
    path('mfa/verify-setup/', MFAVerifySetupView.as_view(), name='auth_mfa_verify_setup'),
    path('sessions/', UserSessionsView.as_view(), name='auth_sessions'),
    path('sessions/revoke/', SessionRevokeView.as_view(), name='auth_session_revoke'),
    path('admin/users/', AdminUserListView.as_view(), name='auth_admin_users'),
]
