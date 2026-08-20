from django.urls import path
from .views import (
    VendorDashboardView,
    VendorListCreateView, VendorDetailView,
    VendorPendingListView, VendorVerifyView, VendorRejectView,
    VendorDocumentListCreateView, VendorDocumentDetailView, DocumentVerifyView,
    VendorCertificationListCreateView, VendorExperienceListCreateView,
    VendorCategoryView, VendorCategoryDetailView, VendorAssignCategoryView,
    VendorRatingListCreateView,
    VendorReviewListCreateView, ReviewModerateView, VendorRespondReviewView,
    VendorPerformanceView,
    VendorSuspendView, VendorBlacklistView, VendorReinstateView,
    VendorAuditLogView, VendorNotificationListView,
    BlacklistAppealView, VendorEligibilityView,
)

urlpatterns = [
    # Dashboard
    path('vendors/dashboard/', VendorDashboardView.as_view(), name='vendor_dashboard'),

    # Vendor CRUD & Search
    path('vendors/', VendorListCreateView.as_view(), name='vendor_list_create'),
    path('vendors/<uuid:pk>/', VendorDetailView.as_view(), name='vendor_detail'),

    # Verification (Admin)
    path('vendors/pending/', VendorPendingListView.as_view(), name='vendor_pending_list'),
    path('vendors/<uuid:pk>/verify/', VendorVerifyView.as_view(), name='vendor_verify'),
    path('vendors/<uuid:pk>/reject/', VendorRejectView.as_view(), name='vendor_reject'),

    # Documents
    path('vendors/<uuid:pk>/documents/', VendorDocumentListCreateView.as_view(), name='vendor_documents'),
    path('vendors/<uuid:pk>/documents/<uuid:doc_id>/', VendorDocumentDetailView.as_view(), name='vendor_document_detail'),
    path('documents/<uuid:doc_id>/verify/', DocumentVerifyView.as_view(), name='document_verify'),

    # Certifications
    path('vendors/<uuid:pk>/certifications/', VendorCertificationListCreateView.as_view(), name='vendor_certifications'),

    # Experience
    path('vendors/<uuid:pk>/experience/', VendorExperienceListCreateView.as_view(), name='vendor_experience'),

    # Categories
    path('vendor-categories/', VendorCategoryView.as_view(), name='vendor_category_list_create'),
    path('vendor-categories/<uuid:pk>/', VendorCategoryDetailView.as_view(), name='vendor_category_detail'),
    path('vendors/<uuid:pk>/categories/', VendorAssignCategoryView.as_view(), name='vendor_assign_category'),

    # Ratings
    path('vendors/<uuid:pk>/ratings/', VendorRatingListCreateView.as_view(), name='vendor_ratings'),

    # Reviews
    path('vendors/<uuid:pk>/reviews/', VendorReviewListCreateView.as_view(), name='vendor_reviews'),
    path('reviews/<uuid:review_id>/moderate/', ReviewModerateView.as_view(), name='review_moderate'),
    path('vendors/<uuid:pk>/reviews/<uuid:review_id>/respond/', VendorRespondReviewView.as_view(), name='vendor_respond_review'),

    # Performance
    path('vendors/<uuid:pk>/performance/', VendorPerformanceView.as_view(), name='vendor_performance'),

    # Status Management
    path('vendors/<uuid:pk>/suspend/', VendorSuspendView.as_view(), name='vendor_suspend'),
    path('vendors/<uuid:pk>/blacklist/', VendorBlacklistView.as_view(), name='vendor_blacklist'),
    path('vendors/<uuid:pk>/reinstate/', VendorReinstateView.as_view(), name='vendor_reinstate'),

    # Audit Logs
    path('vendors/<uuid:pk>/audit-logs/', VendorAuditLogView.as_view(), name='vendor_audit_logs'),
    path('vendor-audit-logs/', VendorAuditLogView.as_view(), name='all_vendor_audit_logs'),

    # Notifications
    path('vendors/<uuid:pk>/notifications/', VendorNotificationListView.as_view(), name='vendor_notifications'),

    # Blacklist Appeal
    path('blacklist/<uuid:blacklist_id>/appeal/', BlacklistAppealView.as_view(), name='blacklist_appeal'),

    # Eligibility
    path('vendors/<uuid:pk>/eligibility/', VendorEligibilityView.as_view(), name='vendor_eligibility'),
]
