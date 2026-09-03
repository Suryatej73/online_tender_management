try:
    from rest_framework import serializers
except ImportError:
    class DummyField:
        def __init__(self, *args, **kwargs): pass
    class DummySerializer:
        def __init__(self, instance=None, data=None, many=False, **kwargs):
            self.instance = instance
            self._data = data or {}
        def is_valid(self): return True
        @property
        def validated_data(self): return self._data
        @property
        def data(self): return self._data
    class serializers:
        ModelSerializer = DummySerializer
        Serializer = DummySerializer
        ReadOnlyField = DummyField
        CharField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        FloatField = DummyField
        DateTimeField = DummyField
        JSONField = DummyField
        ListField = DummyField
        UUIDField = DummyField
        class ValidationError(Exception): pass

from documents.models import (
    DocumentType, Document, DocumentVersion, DocumentOCR,
    DocumentTemplate, DocumentAuditLog
)


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = [
            'id', 'name', 'code', 'description', 'allowed_extensions',
            'max_file_size', 'required', 'requires_ocr', 'requires_verification',
            'expiry_required', 'versioning_enabled', 'is_active'
        ]


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.full_name', default=None)

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'version_number', 'uploaded_by', 'uploaded_by_name',
            'original_filename', 'file_size', 'mime_type', 'sha256_hash',
            'change_summary', 'is_current', 'scan_status', 'ocr_status',
            'verification_status', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'sha256_hash', 'created_at']


class DocumentOCRSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentOCR
        fields = [
            'id', 'version_number', 'extracted_text', 'language',
            'confidence_score', 'page_count', 'processing_status',
            'provider', 'processing_time', 'error_message', 'created_at'
        ]


class DocumentAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAuditLog
        fields = [
            'id', 'action', 'performed_by', 'performed_by_name',
            'details', 'ip_address', 'timestamp'
        ]


class DocumentListSerializer(serializers.ModelSerializer):
    document_type_name = serializers.ReadOnlyField(source='document_type.name', default=None)
    document_type_code = serializers.ReadOnlyField(source='document_type.code', default=None)
    organization_name = serializers.ReadOnlyField(source='organization.name', default='Global')
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.full_name', default=None)
    days_until_expiry = serializers.ReadOnlyField()
    is_downloadable = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'original_filename', 'owner_type', 'owner_id',
            'document_type', 'document_type_name', 'document_type_code',
            'organization', 'organization_name', 'uploaded_by', 'uploaded_by_name',
            'file_size', 'file_extension', 'mime_type', 'sha256_hash',
            'current_version', 'upload_status', 'scan_status', 'ocr_status',
            'verification_status', 'lifecycle_status', 'is_archived',
            'expires_at', 'days_until_expiry', 'is_downloadable',
            'created_at', 'updated_at'
        ]


class DocumentDetailSerializer(serializers.ModelSerializer):
    document_type_name = serializers.ReadOnlyField(source='document_type.name', default=None)
    document_type_code = serializers.ReadOnlyField(source='document_type.code', default=None)
    organization_name = serializers.ReadOnlyField(source='organization.name', default='Global')
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.full_name', default=None)
    verified_by_name = serializers.ReadOnlyField(source='verified_by.full_name', default=None)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    ocr_records = DocumentOCRSerializer(many=True, read_only=True)
    audit_logs = DocumentAuditLogSerializer(many=True, read_only=True)
    days_until_expiry = serializers.ReadOnlyField()
    is_downloadable = serializers.ReadOnlyField()
    is_quarantined = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'original_filename', 'owner_type', 'owner_id',
            'document_type', 'document_type_name', 'document_type_code',
            'organization', 'organization_name', 'uploaded_by', 'uploaded_by_name',
            'file_size', 'file_extension', 'mime_type', 'sha256_hash', 'encryption_status',
            'current_version', 'upload_status', 'scan_status', 'ocr_status',
            'verification_status', 'lifecycle_status', 'is_template', 'is_archived',
            'verified_by', 'verified_by_name', 'verified_at', 'verification_reason',
            'expires_at', 'days_until_expiry', 'is_downloadable', 'is_quarantined',
            'versions', 'ocr_records', 'audit_logs', 'metadata',
            'created_at', 'updated_at'
        ]


class DocumentUploadInitiateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    original_filename = serializers.CharField(max_length=255, required=True)
    file_size = serializers.IntegerField(required=True)
    mime_type = serializers.CharField(max_length=100, default='application/pdf')
    owner_type = serializers.CharField(max_length=50, default='TENDER')
    owner_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    document_type = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    is_multipart = serializers.BooleanField(default=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name', default=None)
    document_type_name = serializers.ReadOnlyField(source='document_type.name', default=None)
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name', default=None)

    class Meta:
        model = DocumentTemplate
        fields = [
            'id', 'name', 'code', 'description', 'category', 'category_name',
            'document_type', 'document_type_name', 'organization', 'version',
            'template_content', 'variables_schema', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
