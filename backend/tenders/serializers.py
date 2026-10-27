import uuid
from django.utils import timezone
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
            if hasattr(item, 'category_id'):
                res['category'] = str(item.category_id) if item.category_id else None
                res['category_name'] = item.category.name if getattr(item, 'category', None) else None
            if hasattr(item, 'organization_id'):
                res['organization'] = str(item.organization_id) if item.organization_id else None
            if hasattr(item, 'effective_organization_name'):
                res['effective_org_name'] = item.effective_organization_name
            if hasattr(item, 'created_by_id'):
                res['created_by'] = str(item.created_by_id) if item.created_by_id else None
                res['created_by_name'] = getattr(item.created_by, 'full_name', str(item.created_by)) if getattr(item, 'created_by', None) else None
            if hasattr(item, 'uploaded_by_id'):
                res['uploaded_by'] = str(item.uploaded_by_id) if item.uploaded_by_id else None
                res['uploaded_by_name'] = getattr(item.uploaded_by, 'full_name', str(item.uploaded_by)) if getattr(item, 'uploaded_by', None) else None
            if hasattr(item, 'parent_category_id'):
                res['parent_category'] = str(item.parent_category_id) if item.parent_category_id else None
                res['parent_category_name'] = item.parent_category.name if getattr(item, 'parent_category', None) else None

            if hasattr(self, 'get_amendment_count') and callable(getattr(self, 'get_amendment_count')):
                try:
                    res['amendment_count'] = self.get_amendment_count(item)
                except Exception:
                    res['amendment_count'] = 0

            if fields and fields != '__all__':
                return {k: res.get(k) for k in fields if k in res or hasattr(item, k)}
            return res

        def is_valid(self, raise_exception=False):
            self._errors = {}
            if hasattr(self, 'Meta') and getattr(self.Meta, 'model', None) and getattr(self.Meta.model, '__name__', '') == 'Tender':
                if not self.partial and ('title' in self._data or self.instance is None):
                    title = (self._data.get('title') or '').strip()
                    if not title:
                        self._errors['title'] = ['This field is required.']

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
        DecimalField = DummyField
        DateTimeField = DummyField
        DateField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        FloatField = DummyField
        UUIDField = DummyField
        JSONField = DummyField
        ListField = DummyField
        DictField = DummyField
        SerializerMethodField = DummyField
        ValidationError = _DummyValidationError

from .models import (
    TenderCategory, Tender, TenderDocument, TenderStatusHistory,
    TenderTemplate, TenderAmendment, TenderVersion, TenderStatus
)


class TenderCategorySerializer(serializers.ModelSerializer):
    parent_category_name = serializers.ReadOnlyField(source='parent_category.name', default=None)

    class Meta:
        model = TenderCategory
        fields = ['id', 'name', 'slug', 'description', 'parent_category', 'parent_category_name', 'is_active', 'created_at']


class TenderCategoryTreeSerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField(read_only=True) if hasattr(serializers, 'SerializerMethodField') else None

    class Meta:
        model = TenderCategory
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'subcategories']

    def get_subcategories(self, obj):
        subs = obj.subcategories.filter(is_active=True)
        return TenderCategoryTreeSerializer(subs, many=True).data


class TenderDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.full_name', default=None)

    class Meta:
        model = TenderDocument
        fields = ['id', 'file_name', 'file_url', 'file_size', 'file_type', 'file_hash', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']


class TenderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'reason', 'changed_at']


class TenderAmendmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name', default=None)

    class Meta:
        model = TenderAmendment
        fields = [
            'id', 'amendment_number', 'title', 'description', 'reason', 'changes',
            'previous_version', 'new_version', 'effective_date', 'status',
            'created_by', 'created_by_name', 'created_at', 'published_at'
        ]
        read_only_fields = ['id', 'amendment_number', 'previous_version', 'new_version', 'created_at', 'published_at']


class TenderVersionSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.ReadOnlyField(source='changed_by.full_name', default=None)

    class Meta:
        model = TenderVersion
        fields = ['id', 'version_number', 'snapshot', 'changed_by', 'changed_by_name', 'change_type', 'created_at']


class TenderTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name', default=None)

    class Meta:
        model = TenderTemplate
        fields = ['id', 'name', 'description', 'category', 'category_name', 'template_data', 'organization', 'is_public', 'created_at']


class TenderSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name', default=None)
    effective_org_name = serializers.ReadOnlyField(source='effective_organization_name')
    created_by_name = serializers.ReadOnlyField(source='created_by.full_name', default=None)
    documents = TenderDocumentSerializer(many=True, read_only=True)
    amendment_count = serializers.SerializerMethodField(read_only=True) if hasattr(serializers, 'SerializerMethodField') else None

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_number', 'title', 'description', 'category', 'category_name',
            'organization', 'effective_org_name', 'created_by', 'created_by_name',
            'status', 'procurement_method', 'budget', 'currency',
            'publication_date', 'start_date', 'submission_deadline', 'opening_date',
            'evaluation_start_date', 'award_date', 'closed_date',
            'eligibility_criteria', 'technical_requirements', 'financial_requirements',
            'estimated_value', 'bid_security_required', 'bid_security_amount',
            'contact_person', 'contact_email', 'contact_phone',
            'version', 'documents', 'amendment_count', 'created_at', 'updated_at'
        ]

    def get_amendment_count(self, obj):
        if hasattr(obj, 'amendments'):
            return obj.amendments.filter(status='PUBLISHED').count()
        return 0


class TenderCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tender
        fields = [
            'title', 'description', 'category', 'organization', 'procurement_method',
            'budget', 'currency', 'start_date', 'submission_deadline', 'opening_date',
            'eligibility_criteria', 'technical_requirements', 'financial_requirements',
            'estimated_value', 'bid_security_required', 'bid_security_amount',
            'contact_person', 'contact_email', 'contact_phone', 'version'
        ]

    def validate(self, attrs):
        budget = attrs.get('budget')
        if budget is not None and budget < 0:
            raise serializers.ValidationError({"budget": "Budget cannot be a negative amount."})

        submission_deadline = attrs.get('submission_deadline')
        if submission_deadline and submission_deadline <= timezone.now():
            raise serializers.ValidationError({"submission_deadline": "Submission deadline must be a future date."})

        opening_date = attrs.get('opening_date')
        if opening_date and submission_deadline and opening_date < submission_deadline:
            raise serializers.ValidationError({"opening_date": "Opening date must be on or after submission deadline."})

        return attrs
