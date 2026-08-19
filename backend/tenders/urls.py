from django.urls import path
from .views import (
    TenderListCreateView, TenderDetailView, TenderLifecycleView, TenderBulkStatusView,
    BOQItemListCreateView, BOQItemDetailView,
    TenderAmendmentListView,
    TenderDocumentListView,
    TenderCategoryListCreateView, TenderCategoryDetailView,
    TenderTemplateListCreateView, TenderTemplateDetailView, TenderTemplateCreateFromView,
    TenderDashboardView,
)

urlpatterns = [
    # Dashboard
    path('dashboard/', TenderDashboardView.as_view(), name='tender_dashboard'),

    # Tender CRUD
    path('', TenderListCreateView.as_view(), name='tender_list_create'),
    path('<uuid:pk>/', TenderDetailView.as_view(), name='tender_detail'),

    # Lifecycle transitions
    path('<uuid:pk>/transition/', TenderLifecycleView.as_view(), name='tender_lifecycle'),
    path('bulk-transition/', TenderBulkStatusView.as_view(), name='tender_bulk_transition'),

    # BOQ Items
    path('<uuid:tender_pk>/boq-items/', BOQItemListCreateView.as_view(), name='boq_item_list_create'),
    path('<uuid:tender_pk>/boq-items/<uuid:item_pk>/', BOQItemDetailView.as_view(), name='boq_item_detail'),

    # Amendments
    path('<uuid:tender_pk>/amendments/', TenderAmendmentListView.as_view(), name='tender_amendment_list'),

    # Documents
    path('<uuid:tender_pk>/documents/', TenderDocumentListView.as_view(), name='tender_document_list'),

    # Categories
    path('categories/', TenderCategoryListCreateView.as_view(), name='tender_category_list_create'),
    path('categories/<uuid:pk>/', TenderCategoryDetailView.as_view(), name='tender_category_detail'),

    # Templates
    path('templates/', TenderTemplateListCreateView.as_view(), name='tender_template_list_create'),
    path('templates/<uuid:pk>/', TenderTemplateDetailView.as_view(), name='tender_template_detail'),
    path('templates/<uuid:pk>/create-tender/', TenderTemplateCreateFromView.as_view(), name='tender_create_from_template'),
]
