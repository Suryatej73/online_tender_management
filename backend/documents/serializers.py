try:
    from rest_framework import serializers
except ImportError:
    class _DummyValidationError(Exception):
        def __init__(self, detail=None, *args, **kwargs):
            self.detail = detail
            super().__init__(str(detail) if detail else "")

    class DummyField:
        def __init__(self, *args, **kwargs): pass

    class DummySerializer:
        def __init__(self, instance=None, data=None, many=False, partial=False, **kwargs):
            self.instance = instance
            self._data = dict(data or {})
            self._kwargs = kwargs
            self.many = many
            self.partial = partial
            self._errors = {}
            if instance is not None:
                if many or (isinstance(instance, (list, tuple)) or (hasattr(instance, '__iter__') and not hasattr(instance, 'pk'))):
                    self.data = [self._serialize_item(u) for u in instance]
                else:
                    self.data = self._serialize_item(instance)
            else:
                self.data = dict(data or {})

        def _serialize_item(self, item):
            if item is None:
                return {}
            if isinstance(item, dict):
                return item

            res = {'id': str(getattr(item, 'id', ''))}
            fields = getattr(getattr(self, 'Meta', None), 'fields', None)

            if hasattr(item, '_meta'):
                for f in item._meta.get_fields():
                    if getattr(f, 'is_relation', False):
                        continue
                    val = getattr(item, f.name, None)
                    if val is not None:
                        if hasattr(val, 'isoformat'):
                            val = val.isoformat()
                        elif hasattr(val, 'hex'):
                            val = str(val)
                        elif hasattr(val, '__float__') and not isinstance(val, bool):
                            try:
                                val = float(val)
                            except Exception:
                                val = str(val)
                    res[f.name] = val
            else:
                for k in dir(item):
                    if not k.startswith('_'):
                        v = getattr(item, k, None)
                        if not callable(v):
                            res[k] = v

            # Resolve special relations and properties
            if hasattr(item, 'document_type_id'):
                res['document_type'] = str(item.document_type_id) if item.document_type_id else None
                res['document_type_name'] = item.document_type.name if getattr(item, 'document_type', None) else None
                res['document_type_code'] = item.document_type.code if getattr(item, 'document_type', None) else None
            if hasattr(item, 'organization_id'):
                res['organization'] = str(item.organization_id) if item.organization_id else None
                res['organization_name'] = getattr(item.organization, 'name', 'Global') if getattr(item, 'organization', None) else 'Global'
            if hasattr(item, 'uploaded_by_id'):
                res['uploaded_by'] = str(item.uploaded_by_id) if item.uploaded_by_id else None
                res['uploaded_by_name'] = getattr(item.uploaded_by, 'full_name', str(item.uploaded_by)) if getattr(item, 'uploaded_by', None) else None
            if hasattr(item, 'verified_by_id'):
                res['verified_by'] = str(item.verified_by_id) if item.verified_by_id else None
                res['verified_by_name'] = getattr(item.verified_by, 'full_name', str(item.verified_by)) if getattr(item, 'verified_by', None) else None
            if hasattr(item, 'days_until_expiry'):
                res['days_until_expiry'] = getattr(item, 'days_until_expiry', None)
            if hasattr(item, 'is_downloadable'):
                res['is_downloadable'] = getattr(item, 'is_downloadable', True)

            if fields and fields != '__all__':
                return {k: res.get(k) for k in fields if k in res or hasattr(item, k)}
            return res

        def is_valid(self, raise_exception=False):
            self._errors = {}
            for attr_name in dir(self):
                if attr_name.startswith('validate_') and callable(getattr(self, attr_name)):
                    field_name = attr_name[len('validate_'):]
                    if field_name in self._data:
                        try:
                            self._data[field_name] = getattr(self, attr_name)(self._data[field_name])
                        except Exception as e:
                            detail = getattr(e, 'detail', str(e))
                            self._errors[field_name] = [str(detail)]

            if hasattr(self, 'validate') and callable(getattr(self, 'validate')):
                try:
                    self._data = self.validate(dict(self._data))
                except Exception as e:
                    detail = getattr(e, 'detail', None)
                    if isinstance(detail, dict):
                        for k, v in detail.items():
                            self._errors[k] = [str(v)] if isinstance(v, str) else [str(x) for x in v]
                    elif detail:
                        self._errors['non_field_errors'] = [str(detail)]
                    else:
                        self._errors['non_field_errors'] = [str(e)]

            if self._errors:
                if raise_exception:
                    raise serializers.ValidationError(self._errors)
                return False
            return True

        @property
        def errors(self):
            return self._errors

        @property
        def validated_data(self):
            return dict(self._data)

        def save(self, **kwargs):
            all_data = {**self._data, **kwargs}
            model_cls = getattr(getattr(self, 'Meta', None), 'model', None)

            if self.instance is not None:
                for k, v in all_data.items():
                    if hasattr(self.instance, k):
                        setattr(self.instance, k, v)
                if hasattr(self.instance, 'save'):
                    self.instance.save()
                self.data = self._serialize_item(self.instance)
                return self.instance

            if model_cls is not None:
                valid_kwargs = {}
                for f in model_cls._meta.get_fields():
                    if getattr(f, 'is_relation', False):
                        attname = getattr(f, 'attname', f"{f.name}_id")
                        val = None
                        if f.name in all_data:
                            val = all_data[f.name]
                        elif attname in all_data:
                            val = all_data[attname]

                        if val is not None:
                            if isinstance(val, str) and (val.strip() == '' or val.strip().lower() == 'null'):
                                valid_kwargs[attname] = None
                            elif hasattr(val, '_meta'):
                                valid_kwargs[f.name] = val
                            else:
                                valid_kwargs[attname] = val
                        elif f.name in all_data or attname in all_data:
                            valid_kwargs[attname] = None
                    elif hasattr(f, 'name') and f.name in all_data:
                        val = all_data[f.name]
                        if f.get_internal_type() in ('DecimalField', 'FloatField'):
                            if val == '' or val is None:
                                val = 0.00
                            else:
                                try:
                                    val = float(val)
                                except (ValueError, TypeError):
                                    val = 0.00
                        elif f.get_internal_type() == 'DateTimeField':
                            if val == '' or val is None:
                                val = None
                        valid_kwargs[f.name] = val

                self.instance = model_cls.objects.create(**valid_kwargs)
                self.data = self._serialize_item(self.instance)
                return self.instance

            return self.instance

    class serializers:
        ModelSerializer = DummySerializer
        Serializer = DummySerializer
        ReadOnlyField = DummyField
        CharField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        FloatField = DummyField
        DateTimeField = DummyField
        DateField = DummyField
        JSONField = DummyField
        ListField = DummyField
        DictField = DummyField
        UUIDField = DummyField
        SerializerMethodField = DummyField
        ValidationError = _DummyValidationError

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
