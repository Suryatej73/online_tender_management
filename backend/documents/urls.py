from django.urls import path
from documents.views import (
    DocumentTypeListView, DocumentListView, DocumentUploadInitiateView,
    DocumentUploadCompleteView, DocumentDetailView, DocumentViewerDataView,
    DocumentDownloadURLView, DocumentVersionListView, DocumentVerifyActionView,
    DocumentArchiveRestoreView, DocumentExpiringListView, DocumentTemplateListView,
    DocumentTemplateGenerateView, StorageHealthCheckView, LocalStorageDirectUploadView,
    LocalStorageDirectDownloadView
)

urlpatterns = [
    # Document Types & Listing
    path('types/', DocumentTypeListView.as_view(), name='document_types'),
    path('', DocumentListView.as_view(), name='document_list'),

    # Upload Workflows
    path('upload/initiate/', DocumentUploadInitiateView.as_view(), name='document_upload_initiate'),
    path('upload/complete/', DocumentUploadCompleteView.as_view(), name='document_upload_complete'),

    # Expiring Documents
    path('expiring/', DocumentExpiringListView.as_view(), name='document_expiring'),

    # Templates & Generation
    path('templates/', DocumentTemplateListView.as_view(), name='document_templates'),
    path('templates/<uuid:pk>/generate/', DocumentTemplateGenerateView.as_view(), name='document_template_generate'),

    # Storage Health & Simulator
    path('health/storage/', StorageHealthCheckView.as_view(), name='storage_health'),
    path('storage/direct-upload/', LocalStorageDirectUploadView.as_view(), name='storage_direct_upload'),
    path('storage/direct-download/', LocalStorageDirectDownloadView.as_view(), name='storage_direct_download'),

    # Document Detail, Viewer, Download, Versions, Actions
    path('<uuid:pk>/', DocumentDetailView.as_view(), name='document_detail'),
    path('<uuid:pk>/viewer/', DocumentViewerDataView.as_view(), name='document_viewer'),
    path('<uuid:pk>/download/', DocumentDownloadURLView.as_view(), name='document_download'),
    path('<uuid:pk>/versions/', DocumentVersionListView.as_view(), name='document_versions'),
    path('<uuid:pk>/verify/', DocumentVerifyActionView.as_view(), name='document_verify'),
    path('<uuid:pk>/<str:action>/', DocumentArchiveRestoreView.as_view(), name='document_archive_restore'),
]
