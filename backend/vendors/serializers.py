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
                if many or (isinstance(instance, (list, tuple)) or hasattr(instance, '__iter__') and not hasattr(instance, 'company_name')):
                    self.data = [
                        {'id': str(getattr(u, 'id', '')), 'company_name': getattr(u, 'company_name', ''), 'status': getattr(u, 'status', 'PENDING_VERIFICATION')}
                        for u in instance
                    ]
                else:
                    self.data = {'id': str(getattr(instance, 'id', '')), 'company_name': getattr(instance, 'company_name', ''), 'status': getattr(instance, 'status', 'PENDING_VERIFICATION')}
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
        DateField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        ListField = DummyField
        JSONField = DummyField
        EmailField = DummyField
        URLField = DummyField
        class ValidationError(Exception): pass


from .models import (
    Vendor, VendorDocument, VendorCategory, VendorCategoryAssignment,
    VendorCertification, VendorExperience, VendorRating, VendorReview,
    VendorPerformanceRecord, VendorStatusHistory, VendorBlacklist,
    VendorSuspension, VendorAuditLog, VendorNotification,
    VendorStatus, DocumentStatus, ReviewStatus, BlacklistStatus,
)


# ──────────────────────────────────────────────
# CATEGORY SERIALIZERS
# ──────────────────────────────────────────────

class VendorCategorySerializer(serializers.ModelSerializer):
    vendor_count = serializers.SerializerMethodField()

    class Meta:
        model = VendorCategory
        fields = ['id', 'name', 'slug', 'description', 'parent_category', 'is_active', 'vendor_count', 'created_at']

    def get_vendor_count(self, obj):
        return obj.vendors.count()


class VendorCategoryTreeSerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = VendorCategory
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'subcategories']

    def get_subcategories(self, obj):
        subs = obj.subcategories.filter(is_active=True)
        return VendorCategoryTreeSerializer(subs, many=True).data


# ──────────────────────────────────────────────
# DOCUMENT SERIALIZERS
# ──────────────────────────────────────────────

class VendorDocumentSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()

    class Meta:
        model = VendorDocument
        fields = [
            'id', 'document_type', 'file_name', 'file_url', 'file_size', 'file_type',
            'expiry_date', 'status', 'reviewer_remarks', 'verified_by', 'verified_by_name',
            'verified_at', 'is_expired', 'days_until_expiry', 'uploaded_at',
        ]
        read_only_fields = ['id', 'status', 'verified_by', 'verified_at', 'uploaded_at']

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.full_name
        return None


# ──────────────────────────────────────────────
# CERTIFICATION & EXPERIENCE SERIALIZERS
# ──────────────────────────────────────────────

class VendorCertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCertification
        fields = [
            'id', 'name', 'issuing_authority', 'issue_date', 'expiry_date',
            'certificate_number', 'is_active', 'created_at',
        ]


class VendorExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorExperience
        fields = [
            'id', 'project_name', 'client_name', 'project_value',
            'start_date', 'end_date', 'description', 'is_completed', 'created_at',
        ]


# ──────────────────────────────────────────────
# VENDOR LIST SERIALIZER (lightweight)
# ──────────────────────────────────────────────

class VendorListSerializer(serializers.ModelSerializer):
    display_rating = serializers.ReadOnlyField()
    document_count = serializers.SerializerMethodField()
    primary_category = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'company_name', 'registration_number', 'email', 'phone',
            'city', 'state', 'country', 'status', 'overall_rating',
            'rating_count', 'performance_score', 'completed_projects',
            'profile_completion', 'is_draft', 'display_rating',
            'document_count', 'primary_category', 'created_at', 'updated_at',
        ]

    def get_document_count(self, obj):
        return obj.documents.count()

    def get_primary_category(self, obj):
        primary = obj.category_assignments.filter(is_primary=True).first()
        if primary:
            return primary.category.name
        first = obj.category_assignments.first()
        if first:
            return first.category.name
        return None


# ──────────────────────────────────────────────
# VENDOR DETAIL SERIALIZER (full profile)
# ──────────────────────────────────────────────

class VendorDetailSerializer(serializers.ModelSerializer):
    display_rating = serializers.ReadOnlyField()
    categories = VendorCategorySerializer(source='category_assignments', many=True, read_only=True)
    documents = VendorDocumentSerializer(many=True, read_only=True)
    certifications = VendorCertificationSerializer(many=True, read_only=True)
    experience_records = VendorExperienceSerializer(many=True, read_only=True)
    status_history = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'user', 'user_name', 'company_name', 'registration_number',
            'business_type', 'industry', 'description', 'year_established',
            'email', 'phone', 'website', 'address', 'city', 'state', 'country',
            'tax_number', 'num_employees', 'annual_turnover',
            'contact_person_name', 'contact_person_designation',
            'contact_person_email', 'contact_person_phone', 'company_logo',
            'status', 'is_draft',
            'overall_rating', 'quality_rating', 'technical_rating',
            'timeliness_rating', 'communication_rating', 'compliance_rating',
            'rating_count', 'performance_score',
            'completed_projects', 'active_projects', 'total_bids', 'won_bids',
            'on_time_percentage', 'profile_completion',
            'verified_at', 'created_at', 'updated_at',
            'categories', 'documents', 'certifications',
            'experience_records', 'status_history', 'display_rating',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return None

    def get_status_history(self, obj):
        from .models import VendorStatusHistory
        history = VendorStatusHistory.objects.filter(vendor=obj)
        return VendorStatusHistorySerializer(history, many=True).data


# ──────────────────────────────────────────────
# VENDOR CREATE/UPDATE SERIALIZER
# ──────────────────────────────────────────────

class VendorCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'company_name', 'registration_number', 'business_type', 'industry',
            'description', 'year_established', 'email', 'phone', 'website',
            'address', 'city', 'state', 'country', 'tax_number',
            'num_employees', 'annual_turnover',
            'contact_person_name', 'contact_person_designation',
            'contact_person_email', 'contact_person_phone', 'company_logo',
        ]

    def validate_email(self, value):
        vendor_id = self.instance.id if self.instance else None
        if Vendor.objects.filter(email=value).exclude(id=vendor_id).exists():
            raise serializers.ValidationError("A vendor with this email already exists.")
        return value

    def validate_registration_number(self, value):
        vendor_id = self.instance.id if self.instance else None
        if Vendor.objects.filter(registration_number=value).exclude(id=vendor_id).exists():
            raise serializers.ValidationError("A vendor with this registration number already exists.")
        return value


# ──────────────────────────────────────────────
# RATING SERIALIZER
# ──────────────────────────────────────────────

class VendorRatingSerializer(serializers.ModelSerializer):
    rated_by_name = serializers.SerializerMethodField()
    average_score = serializers.ReadOnlyField()

    class Meta:
        model = VendorRating
        fields = [
            'id', 'vendor', 'rated_by', 'rated_by_name', 'organization', 'tender',
            'overall_performance', 'quality_of_work', 'technical_capability',
            'timeliness', 'communication', 'professionalism', 'compliance',
            'value_for_money', 'average_score', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'rated_by', 'created_at', 'updated_at']

    def get_rated_by_name(self, obj):
        if obj.rated_by:
            return obj.rated_by.full_name
        return None

    def validate_overall_performance(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


# ──────────────────────────────────────────────
# REVIEW SERIALIZER
# ──────────────────────────────────────────────

class VendorReviewSerializer(serializers.ModelSerializer):
    review_by_name = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorReview
        fields = [
            'id', 'vendor', 'review_by', 'review_by_name', 'organization',
            'organization_name', 'tender', 'rating', 'comment',
            'review_status', 'vendor_response', 'vendor_response_date',
            'moderated_by', 'moderation_remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'review_by', 'review_status', 'moderated_by',
            'moderation_remarks', 'created_at', 'updated_at',
        ]

    def get_review_by_name(self, obj):
        if obj.review_by:
            return obj.review_by.full_name
        return None

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None


# ──────────────────────────────────────────────
# PERFORMANCE SERIALIZER
# ──────────────────────────────────────────────

class VendorPerformanceSerializer(serializers.ModelSerializer):
    weighted_score = serializers.ReadOnlyField()
    organization_name = serializers.SerializerMethodField()
    tender_title = serializers.SerializerMethodField()

    class Meta:
        model = VendorPerformanceRecord
        fields = [
            'id', 'vendor', 'tender', 'tender_title', 'organization', 'organization_name',
            'contract_value', 'start_date', 'expected_completion', 'actual_completion',
            'quality_score', 'timeliness_score', 'technical_score',
            'communication_score', 'compliance_score', 'overall_rating',
            'weighted_score', 'organization_remarks', 'is_completed',
            'created_at', 'updated_at',
        ]

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

    def get_tender_title(self, obj):
        if obj.tender:
            return obj.tender.title
        return None


# ──────────────────────────────────────────────
# STATUS HISTORY SERIALIZER
# ──────────────────────────────────────────────

class VendorStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorStatusHistory
        fields = [
            'id', 'from_status', 'to_status', 'changed_by',
            'changed_by_name', 'reason', 'changed_at',
        ]


# ──────────────────────────────────────────────
# BLACKLIST SERIALIZER
# ──────────────────────────────────────────────

class VendorBlacklistSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorBlacklist
        fields = [
            'id', 'vendor', 'reason', 'description', 'start_date', 'end_date',
            'is_permanent', 'evidence_file', 'created_by', 'created_by_name',
            'status', 'appeal_remarks', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


# ──────────────────────────────────────────────
# SUSPENSION SERIALIZER
# ──────────────────────────────────────────────

class VendorSuspensionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorSuspension
        fields = [
            'id', 'vendor', 'reason', 'remarks', 'start_date', 'end_date',
            'is_auto_restore', 'restored', 'restored_at',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'restored', 'restored_at', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


# ──────────────────────────────────────────────
# AUDIT LOG SERIALIZER
# ──────────────────────────────────────────────

class VendorAuditLogSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorAuditLog
        fields = [
            'id', 'vendor', 'vendor_name', 'user', 'user_name',
            'action', 'description', 'ip_address', 'timestamp',
        ]

    def get_vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.company_name
        return None

    def get_user_name(self, obj):
        if obj.user_name:
            return obj.user_name
        if obj.user:
            return obj.user.full_name
        return None


# ──────────────────────────────────────────────
# NOTIFICATION SERIALIZER
# ──────────────────────────────────────────────

class VendorNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorNotification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'link', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ──────────────────────────────────────────────
# DASHBOARD SERIALIZER
# ──────────────────────────────────────────────

class VendorDashboardSerializer(serializers.Serializer):
    total_vendors = serializers.IntegerField()
    verified_vendors = serializers.IntegerField()
    pending_vendors = serializers.IntegerField()
    suspended_vendors = serializers.IntegerField()
    blacklisted_vendors = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    recent_vendors = VendorListSerializer(many=True)
    top_performing = VendorListSerializer(many=True)
    expiring_documents = VendorDocumentSerializer(many=True)
    status_breakdown = serializers.DictField()
    category_breakdown = serializers.ListField()
