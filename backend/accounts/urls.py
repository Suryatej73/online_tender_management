from django.urls import path
from .views import (
    RegisterView, LoginView, MFALoginView, UserProfileView, EmailVerifyView,
    PasswordResetRequestView, PasswordResetConfirmView, MFASetupView,
    MFAVerifySetupView, UserSessionsView, SessionRevokeView, AdminUserListView,
    UserListCreateView, UserDetailView, UserSuspendView, UserActivateView,
    UserVerifyView, UserAdminResetPasswordView, UserActivityView,
    UserDetailSessionsView, RolesView, PermissionsView, RolePermissionsUpdateView,
    OrganizationsView, DepartmentsView, GoogleLoginView, SendOTPView, VerifyOTPView,
    EvaluatorOversightView
)
from .admin_views import (
    AdminDashboardView, AdminOrganizationView, AdminOrganizationVerifyView,
    AdminVendorManagementView, AdminVendorVerifyView, AdminVendorSuspendView,
    AdminVendorBlacklistView, AdminBlacklistListView, AdminCategoryView,
    AdminTenderMonitoringView, AdminTenderFlagView, AdminComplaintView,
    AdminComplaintResolveView, AdminRiskAlertView, AdminAnnouncementView,
    AdminAuditLogView, AdminAuditLogExportView, AdminSystemSettingsView,
    AdminReportsView
)

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('login/mfa/', MFALoginView.as_view(), name='auth_login_mfa'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'),
    path('otp/send/', SendOTPView.as_view(), name='auth_otp_send'),
    path('otp/verify/', VerifyOTPView.as_view(), name='auth_otp_verify'),
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

    # Full Enterprise Admin Module Endpoints (/api/v1/admin/*)
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('admin/statistics/', AdminDashboardView.as_view(), name='admin_statistics'),
    path('admin/evaluators/', EvaluatorOversightView.as_view(), name='admin_evaluator_oversight'),
    path('admin/organizations/', AdminOrganizationView.as_view(), name='admin_organizations'),
    path('admin/organizations/<uuid:pk>/verify/', AdminOrganizationVerifyView.as_view(), name='admin_org_verify'),
    path('admin/vendors/', AdminVendorManagementView.as_view(), name='admin_vendors'),
    path('admin/vendors/<uuid:pk>/verify/', AdminVendorVerifyView.as_view(), name='admin_vendor_verify'),
    path('admin/vendors/<uuid:pk>/suspend/', AdminVendorSuspendView.as_view(), name='admin_vendor_suspend'),
    path('admin/vendors/<uuid:pk>/blacklist/', AdminVendorBlacklistView.as_view(), name='admin_vendor_blacklist'),
    path('admin/blacklists/', AdminBlacklistListView.as_view(), name='admin_blacklists'),
    path('admin/categories/', AdminCategoryView.as_view(), name='admin_categories'),
    path('admin/tenders/', AdminTenderMonitoringView.as_view(), name='admin_tenders'),
    path('admin/tenders/<uuid:pk>/flag/', AdminTenderFlagView.as_view(), name='admin_tender_flag'),
    path('admin/tenders/<uuid:pk>/cancel/', AdminTenderFlagView.as_view(), name='admin_tender_cancel'),
    path('admin/complaints/', AdminComplaintView.as_view(), name='admin_complaints'),
    path('admin/complaints/<uuid:pk>/resolve/', AdminComplaintResolveView.as_view(), name='admin_complaint_resolve'),
    path('admin/risk-alerts/', AdminRiskAlertView.as_view(), name='admin_risk_alerts'),
    path('admin/announcements/', AdminAnnouncementView.as_view(), name='admin_announcements'),
    path('admin/audit-logs/', AdminAuditLogView.as_view(), name='admin_audit_logs'),
    path('admin/audit-logs/export/', AdminAuditLogExportView.as_view(), name='admin_audit_export'),
    path('admin/settings/', AdminSystemSettingsView.as_view(), name='admin_settings'),
    path('admin/reports/<str:report_type>/', AdminReportsView.as_view(), name='admin_reports'),
]
