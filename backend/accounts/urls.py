from django.urls import path
from .views import (
    RegisterView, LoginView, MFALoginView, UserProfileView, EmailVerifyView,
    PasswordResetRequestView, PasswordResetConfirmView, MFASetupView,
    MFAVerifySetupView, UserSessionsView, SessionRevokeView, AdminUserListView,
    UserListCreateView, UserDetailView, UserSuspendView, UserActivateView,
    UserVerifyView, UserAdminResetPasswordView, UserActivityView,
    UserDetailSessionsView, RolesView, PermissionsView, RolePermissionsUpdateView,
    OrganizationsView, DepartmentsView
)

urlpatterns = [
    # Auth
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

    # User Management Endpoints (Module 3)
    path('users/', UserListCreateView.as_view(), name='user_list_create'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('users/<uuid:pk>/suspend/', UserSuspendView.as_view(), name='user_suspend'),
    path('users/<uuid:pk>/activate/', UserActivateView.as_view(), name='user_activate'),
    path('users/<uuid:pk>/verify/', UserVerifyView.as_view(), name='user_verify'),
    path('users/<uuid:pk>/reset-password/', UserAdminResetPasswordView.as_view(), name='user_reset_password'),
    path('users/<uuid:pk>/activity/', UserActivityView.as_view(), name='user_activity'),
    path('users/<uuid:pk>/sessions/', UserDetailSessionsView.as_view(), name='user_sessions'),
    path('admin/users/', AdminUserListView.as_view(), name='auth_admin_users'),

    # RBAC & Meta
    path('roles/', RolesView.as_view(), name='roles_list'),
    path('permissions/', PermissionsView.as_view(), name='permissions_list'),
    path('roles/<str:role_code>/permissions/', RolePermissionsUpdateView.as_view(), name='role_permissions_update'),
    path('organizations/', OrganizationsView.as_view(), name='organizations_list'),
    path('departments/', DepartmentsView.as_view(), name='departments_list'),
]

