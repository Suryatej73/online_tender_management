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
                self.data = data or {}
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
        EmailField = DummyField
        UUIDField = DummyField
        IntegerField = DummyField
        DecimalField = DummyField
        DateTimeField = DummyField
        BooleanField = DummyField
        ChoiceField = DummyField
        ListField = DummyField
        DictField = DummyField
        SerializerMethodField = DummyField
        class ValidationError(Exception): pass

from .models import (
    TenderStatus, TenderCategory, TenderTemplate,
    Tender, BOQItem, TenderAmendment, TenderDocument
)


class TenderCategorySerializer(serializers.ModelSerializer):
    tender_count = serializers.SerializerMethodField()

    class Meta:
        model = TenderCategory
        fields = ['id', 'name', 'code', 'description', 'is_active', 'tender_count', 'created_at']

    def get_tender_count(self, obj):
        return obj.tenders.filter(is_deleted=False).count() if hasattr(obj, 'tenders') else 0


class TenderTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='General')
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default='system')

    class Meta:
        model = TenderTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'default_terms', 'default_requirements', 'is_active',
            'created_by', 'created_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BOQItemSerializer(serializers.ModelSerializer):
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = BOQItem
        fields = [
            'id', 'tender', 'item_number', 'description', 'unit',
            'quantity', 'unit_price', 'total_price', 'specifications'
        ]
        read_only_fields = ['id', 'total_price']


class TenderAmendmentSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default='system')

    class Meta:
        model = TenderAmendment
        fields = [
            'id', 'tender', 'amendment_number', 'title', 'description',
            'changes_summary', 'previous_values', 'new_values',
            'created_by', 'created_by_email', 'created_at', 'is_active'
        ]
        read_only_fields = ['id', 'amendment_number', 'created_at']


class TenderDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True, default='system')
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = TenderDocument
        fields = [
            'id', 'tender', 'name', 'document_type', 'document_type_display',
            'file_url', 'file_size', 'uploaded_by', 'uploaded_by_email', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at']


class TenderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default='Uncategorized')
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default='system')
    organization_name = serializers.CharField(read_only=True, default='Unknown')
    days_until_deadline = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    boq_items_count = serializers.SerializerMethodField()
    amendments_count = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_number', 'title', 'description', 'category', 'category_name',
            'estimated_cost', 'emd_amount', 'currency', 'status', 'status_display',
            'publish_date', 'submission_deadline', 'is_two_envelope',
            'is_reverse_auction_eligible', 'location', 'organization_name',
            'created_by', 'created_by_email', 'version',
            'days_until_deadline', 'is_expired', 'boq_items_count', 'amendments_count',
            'created_at', 'updated_at'
        ]

    def get_boq_items_count(self, obj):
        return obj.boq_items.count() if hasattr(obj, 'boq_items') else 0

    def get_amendments_count(self, obj):
        return obj.amendments.count() if hasattr(obj, 'amendments') else 0


class TenderDetailSerializer(serializers.ModelSerializer):
    """Full serializer with nested BOQ items, amendments, and documents."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default='Uncategorized')
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default='system')
    organization_name = serializers.CharField(read_only=True, default='Unknown')
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    days_until_deadline = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    boq_items = BOQItemSerializer(many=True, read_only=True)
    amendments = TenderAmendmentSerializer(many=True, read_only=True)
    documents = TenderDocumentSerializer(many=True, read_only=True)
    total_boq_value = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_number', 'title', 'description',
            'category', 'category_name', 'template', 'template_name',
            'organization', 'organization_name', 'department', 'department_name',
            'estimated_cost', 'emd_amount', 'currency',
            'publish_date', 'submission_deadline', 'evaluation_start', 'evaluation_end', 'award_date',
            'status', 'status_display',
            'published_at', 'activated_at', 'evaluation_started_at', 'awarded_at', 'closed_at',
            'is_two_envelope', 'is_reverse_auction_eligible', 'location',
            'created_by', 'created_by_email', 'version',
            'days_until_deadline', 'is_expired',
            'boq_items', 'amendments', 'documents', 'total_boq_value',
            'is_deleted', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tender_number', 'version', 'is_deleted',
            'published_at', 'activated_at', 'evaluation_started_at', 'awarded_at', 'closed_at',
            'created_at', 'updated_at'
        ]

    def get_total_boq_value(self, obj):
        items = obj.boq_items.all()
        return str(sum(item.total_price for item in items))


class TenderCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tenders."""
    boq_items = BOQItemSerializer(many=True, required=False)

    class Meta:
        model = Tender
        fields = [
            'title', 'description', 'category', 'template',
            'organization', 'department',
            'estimated_cost', 'emd_amount', 'currency',
            'submission_deadline', 'evaluation_start', 'evaluation_end',
            'is_two_envelope', 'is_reverse_auction_eligible', 'location',
            'boq_items'
        ]

    def create(self, validated_data):
        boq_items_data = validated_data.pop('boq_items', [])
        tender = Tender.objects.create(**validated_data)
        for item_data in boq_items_data:
            BOQItem.objects.create(tender=tender, **item_data)
        return tender

    def update(self, instance, validated_data):
        boq_items_data = validated_data.pop('boq_items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if boq_items_data is not None:
            instance.boq_items.all().delete()
            for item_data in boq_items_data:
                BOQItem.objects.create(tender=instance, **item_data)

        return instance
