from django.urls import path
from .views import (
    TenderListCreateView, TenderDetailView, TenderTransitionView,
    TenderCategoryView, TenderCategoryDetailView, TenderTemplateView,
    ApplyTemplateView, TenderAmendmentView, PublishAmendmentView,
    TenderVersionHistoryView
)

urlpatterns = [
    # Tender CRUD & Search
    path('tenders/', TenderListCreateView.as_view(), name='tender_list_create'),
    path('tenders/<uuid:pk>/', TenderDetailView.as_view(), name='tender_detail'),
    path('tenders/<uuid:pk>/transition/', TenderTransitionView.as_view(), name='tender_transition'),
    path('tenders/<uuid:pk>/versions/', TenderVersionHistoryView.as_view(), name='tender_versions'),

    # Tender Categories
    path('tender-categories/', TenderCategoryView.as_view(), name='category_list_create'),
    path('tender-categories/<uuid:pk>/', TenderCategoryDetailView.as_view(), name='category_detail'),

    # Tender Templates
    path('tender-templates/', TenderTemplateView.as_view(), name='template_list_create'),
    path('tender-templates/<uuid:pk>/apply/', ApplyTemplateView.as_view(), name='apply_template'),

    # Amendments
    path('tenders/<uuid:pk>/amendments/', TenderAmendmentView.as_view(), name='amendment_list_create'),
    path('tenders/<uuid:pk>/amendments/<uuid:aid>/publish/', PublishAmendmentView.as_view(), name='publish_amendment'),
]
