from django.urls import path
from .views import (
    BidDashboardView, BidListCreateView, BidDetailView,
    BidSubmitView, TechnicalBidView, FinancialBidView,
    BidDocumentListCreateView, BidDocumentDetailView,
    BidAmendView, BidWithdrawView, BidVersionHistoryView,
    BidOpeningView, BidAccessLogView, BidIntegrityView,
)

urlpatterns = [
    # Dashboard
    path('bids/dashboard/', BidDashboardView.as_view(), name='bid_dashboard'),

    # Bid CRUD
    path('bids/', BidListCreateView.as_view(), name='bid_list_create'),
    path('bids/<uuid:pk>/', BidDetailView.as_view(), name='bid_detail'),

    # Bid Submission
    path('bids/<uuid:pk>/submit/', BidSubmitView.as_view(), name='bid_submit'),

    # Technical Bid
    path('bids/<uuid:pk>/technical/', TechnicalBidView.as_view(), name='bid_technical'),

    # Financial Bid (strict access control enforced in view)
    path('bids/<uuid:pk>/financial/', FinancialBidView.as_view(), name='bid_financial'),

    # Documents
    path('bids/<uuid:pk>/documents/', BidDocumentListCreateView.as_view(), name='bid_documents'),
    path('bids/<uuid:pk>/documents/<uuid:doc_id>/', BidDocumentDetailView.as_view(), name='bid_document_detail'),

    # Amendment
    path('bids/<uuid:pk>/amend/', BidAmendView.as_view(), name='bid_amend'),

    # Withdrawal
    path('bids/<uuid:pk>/withdraw/', BidWithdrawView.as_view(), name='bid_withdraw'),

    # Version History
    path('bids/<uuid:pk>/versions/', BidVersionHistoryView.as_view(), name='bid_versions'),

    # Integrity Verification
    path('bids/<uuid:pk>/integrity/', BidIntegrityView.as_view(), name='bid_integrity'),

    # Bid Opening (tender-level)
    path('tenders/<uuid:pk>/opening/', BidOpeningView.as_view(), name='bid_opening'),

    # Audit Logs
    path('bids/<uuid:pk>/audit-logs/', BidAccessLogView.as_view(), name='bid_audit_logs'),
    path('bids/audit-logs/', BidAccessLogView.as_view(), name='all_bid_audit_logs'),
]
