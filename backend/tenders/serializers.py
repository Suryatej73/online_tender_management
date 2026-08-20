import uuid
from django.utils import timezone
try:
    from rest_framework import serializers
except ImportError:
    class DummyField:
        def __init__(self, *args, **kwargs): pass
    class DummySerializer:
        def __init__(self, instance=None, data=None, many=False, **kwargs):
            self.instance = instance
            self._data = data or {}
            if instance is not None:
                if many or (isinstance(instance, (list, tuple)) or hasattr(instance, '__iter__') and not hasattr(instance, 'tender_number')):
                    self.data = [
                        {'id': str(getattr(u, 'id', '')), 'title': getattr(u, 'title', ''), 'status': getattr(u, 'status', 'DRAFT')}
                        for u in instance
                    ]
                else:
                    self.data = {'id': str(getattr(instance, 'id', '')), 'title': getattr(instance, 'title', ''), 'status': getattr(instance, 'status', 'DRAFT')}
            else:
                self.data = data or {}
        def is_valid(self): return True
        @property
        def validated_data(self): return self._data
        def save(self): return self.instance
    class serializers:
        ModelSerializer = DummySerializer
        Serializer = DummySerializer
        ReadOnlyField = DummyField
        CharField = DummyField
        DecimalField = DummyField
        DateTimeField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        UUIDField = DummyField
        class ValidationError(Exception): pass

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
    subcategories = serializers.SerializerMethodGetter() if hasattr(serializers, 'SerializerMethodGetter') else None

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
    amendment_count = serializers.SerializerMethodGetter() if hasattr(serializers, 'SerializerMethodGetter') else None

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
