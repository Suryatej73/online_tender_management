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
                self.data = {'id': str(getattr(instance, 'id', ''))}
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
        JSONField = DummyField
        class ValidationError(Exception): pass

from .models import (
    Bid, BidStatus, TechnicalBid, FinancialBid, BidDocument,
    BidAmendment, BidWithdrawal, BidOpening, BidOpeningAuthorization,
    BidAccessLog, BidIntegrityRecord, BidVersion,
    BidDocumentType, BidDocumentVerificationStatus, OpeningStage, IntegrityStatus,
)


# ──────────────────────────────────────────────
# BID LIST SERIALIZER (safe for all viewers)
# ──────────────────────────────────────────────

class BidListSerializer(serializers.ModelSerializer):
    """Safe bid serializer — never exposes financial data."""
    tender_title = serializers.SerializerMethodField()
    tender_number = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    document_count = serializers.SerializerMethodField()
    has_technical = serializers.SerializerMethodField()
    has_financial = serializers.SerializerMethodField()
    is_modifiable = serializers.SerializerMethodField()
    can_withdraw = serializers.SerializerMethodField()
    deadline_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Bid
        fields = [
            'id', 'bid_reference', 'status', 'status_display',
            'current_version', 'tender', 'tender_title', 'tender_number',
            'vendor', 'vendor_name',
            'submitted_at', 'locked_at', 'withdrawn_at',
            'document_count', 'has_technical', 'has_financial',
            'is_modifiable', 'can_withdraw', 'deadline_remaining',
            'created_at', 'updated_at',
        ]

    def get_tender_title(self, obj):
        return obj.tender.title if obj.tender else None

    def get_tender_number(self, obj):
        return obj.tender.tender_number if obj.tender else None

    def get_vendor_name(self, obj):
        return obj.vendor.company_name if obj.vendor else None

    def get_document_count(self, obj):
        return obj.documents.filter(is_deleted=False).count()

    def get_has_technical(self, obj):
        return hasattr(obj, 'technical_bid') and obj.technical_bid is not None

    def get_has_financial(self, obj):
        return hasattr(obj, 'financial_bid') and obj.financial_bid is not None

    def get_is_modifiable(self, obj):
        return obj.ismodifiable

    def get_can_withdraw(self, obj):
        return obj.can_withdraw

    def get_deadline_remaining(self, obj):
        if obj.tender and obj.tender.submission_deadline:
            now = timezone.now()
            if obj.tender.submission_deadline > now:
                delta = obj.tender.submission_deadline - now
                return {
                    'remaining_seconds': int(delta.total_seconds()),
                    'is_expired': False,
                }
            return {'remaining_seconds': 0, 'is_expired': True}
        return None


# ──────────────────────────────────────────────
# BID DETAIL SERIALIZER
# ──────────────────────────────────────────────

class BidDetailSerializer(serializers.ModelSerializer):
    """Bid detail — includes technical bid but NOT financial bid data."""
    tender_title = serializers.SerializerMethodField()
    tender_number = serializers.SerializerMethodField()
    tender_deadline = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_company = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    documents = serializers.SerializerMethodField()
    technical_bid = serializers.SerializerMethodField()
    financial_bid_status = serializers.SerializerMethodField()
    versions = serializers.SerializerMethodField()
    amendments = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    integrity_status = serializers.SerializerMethodField()

    class Meta:
        model = Bid
        fields = [
            'id', 'bid_reference', 'status', 'status_display',
            'current_version',
            'tender', 'tender_title', 'tender_number', 'tender_deadline',
            'vendor', 'vendor_name', 'vendor_company',
            'submitted_at', 'locked_at', 'withdrawn_at',
            'created_at', 'updated_at', 'notes',
            'documents', 'technical_bid', 'financial_bid_status',
            'versions', 'amendments', 'timeline', 'integrity_status',
        ]

    def get_tender_title(self, obj):
        return obj.tender.title if obj.tender else None

    def get_tender_number(self, obj):
        return obj.tender.tender_number if obj.tender else None

    def get_tender_deadline(self, obj):
        if obj.tender and obj.tender.submission_deadline:
            return obj.tender.submission_deadline.isoformat()
        return None

    def get_vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.contact_person_name or obj.vendor.company_name
        return None

    def get_vendor_company(self, obj):
        return obj.vendor.company_name if obj.vendor else None

    def get_documents(self, obj):
        docs = obj.documents.filter(is_deleted=False)
        return BidDocumentSerializer(docs, many=True).data

    def get_technical_bid(self, obj):
        if hasattr(obj, 'technical_bid') and obj.technical_bid:
            return TechnicalBidSerializer(obj.technical_bid).data
        return None

    def get_financial_bid_status(self, obj):
        """NEVER expose financial data — only status."""
        has_financial = hasattr(obj, 'financial_bid') and obj.financial_bid is not None
        if not has_financial:
            return {'status': 'NOT_SUBMITTED'}
        # Financial data is sealed until authorized opening
        is_opened = obj.status in [
            BidStatus.FINANCIAL_OPENED,
            BidStatus.EVALUATED,
            BidStatus.AWARDED,
            BidStatus.REJECTED,
            BidStatus.DISQUALIFIED,
        ]
        if is_opened:
            return {'status': 'OPENED', 'message': 'Financial data available to authorized users.'}
        return {'status': 'SEALED', 'message': 'Financial details sealed until authorized opening.'}

    def get_versions(self, obj):
        versions = obj.versions.all()
        return BidVersionSerializer(versions, many=True).data

    def get_amendments(self, obj):
        amendments = obj.amendments.all()
        return BidAmendmentSerializer(amendments, many=True).data

    def get_timeline(self, obj):
        """Build a tracking timeline for the vendor."""
        timeline = []
        timeline.append({
            'step': 'Bid Created',
            'completed': True,
            'timestamp': obj.created_at.isoformat() if obj.created_at else None,
        })
        timeline.append({
            'step': 'Technical Proposal',
            'completed': hasattr(obj, 'technical_bid') and obj.technical_bid is not None,
            'timestamp': obj.technical_bid.created_at.isoformat()
            if hasattr(obj, 'technical_bid') and obj.technical_bid else None,
        })
        timeline.append({
            'step': 'Financial Proposal',
            'completed': hasattr(obj, 'financial_bid') and obj.financial_bid is not None,
            'timestamp': None,
        })
        timeline.append({
            'step': 'Documents Submitted',
            'completed': obj.documents.filter(is_deleted=False).count() > 0,
            'timestamp': None,
        })
        timeline.append({
            'step': 'Bid Submitted',
            'completed': obj.submitted_at is not None,
            'timestamp': obj.submitted_at.isoformat() if obj.submitted_at else None,
        })
        timeline.append({
            'step': 'Bid Locked',
            'completed': obj.locked_at is not None,
            'timestamp': obj.locked_at.isoformat() if obj.locked_at else None,
        })
        timeline.append({
            'step': 'Technical Evaluation',
            'completed': obj.status in [
                BidStatus.TECHNICAL_EVALUATION, BidStatus.FINANCIAL_OPENING_AUTHORIZED,
                BidStatus.FINANCIAL_OPENED, BidStatus.EVALUATED,
                BidStatus.AWARDED, BidStatus.REJECTED, BidStatus.DISQUALIFIED,
            ],
        })
        timeline.append({
            'step': 'Financial Opening',
            'completed': obj.status in [
                BidStatus.FINANCIAL_OPENED, BidStatus.EVALUATED,
                BidStatus.AWARDED, BidStatus.REJECTED, BidStatus.DISQUALIFIED,
            ],
        })
        timeline.append({
            'step': 'Final Evaluation',
            'completed': obj.status in [
                BidStatus.EVALUATED, BidStatus.AWARDED,
                BidStatus.REJECTED, BidStatus.DISQUALIFIED,
            ],
        })
        timeline.append({
            'step': 'Award Decision',
            'completed': obj.status == BidStatus.AWARDED,
        })
        return timeline

    def get_integrity_status(self, obj):
        record = getattr(obj, 'integrity_record', None)
        if record:
            return {
                'status': record.status,
                'verified_at': record.verified_at.isoformat() if record.verified_at else None,
            }
        return {'status': 'PENDING'}


# ──────────────────────────────────────────────
# FINANCIAL BID SERIALIZERS (CONTEXT-DEPENDENT)
# ──────────────────────────────────────────────

class FinancialBidSealedSerializer(serializers.ModelSerializer):
    """
    Returned when financial bid is SEALED.
    Shows only status, never the actual financial data.
    """
    class Meta:
        model = FinancialBid
        fields = ['id', 'currency']
        read_only_fields = ['id', 'currency']

    def to_representation(self, instance):
        return {
            'id': str(instance.id),
            'status': 'SEALED',
            'currency': instance.currency,
            'message': 'Financial details are sealed until authorized financial opening.',
        }


class FinancialBidVendorSerializer(serializers.ModelSerializer):
    """
    Returned to the owning vendor before opening.
    Shows their own financial data.
    """
    class Meta:
        model = FinancialBid
        fields = [
            'id', 'currency', 'total_amount', 'tax_amount',
            'discount', 'final_amount', 'pricing_breakdown',
            'created_at',
        ]


class FinancialBidFullSerializer(serializers.ModelSerializer):
    """
    Returned AFTER authorized financial opening to authorized users.
    Full financial data with opening metadata.
    """
    opened_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FinancialBid
        fields = [
            'id', 'currency', 'total_amount', 'tax_amount',
            'discount', 'final_amount', 'pricing_breakdown',
            'opened_at', 'opened_by', 'opened_by_name',
            'created_at',
        ]

    def get_opened_by_name(self, obj):
        if obj.opened_by:
            return obj.opened_by.full_name
        return None


# ──────────────────────────────────────────────
# TECHNICAL BID SERIALIZER
# ──────────────────────────────────────────────

class TechnicalBidSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicalBid
        fields = [
            'id', 'methodology', 'technical_description',
            'implementation_plan', 'delivery_plan',
            'team_information', 'compliance_statement',
            'equipment_details', 'quality_assurance',
            'technical_score', 'evaluated_by', 'evaluated_at',
            'evaluation_remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'technical_score', 'evaluated_by', 'evaluated_at', 'created_at', 'updated_at']


class TechnicalBidCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicalBid
        fields = [
            'methodology', 'technical_description',
            'implementation_plan', 'delivery_plan',
            'team_information', 'compliance_statement',
            'equipment_details', 'quality_assurance',
        ]


# ──────────────────────────────────────────────
# FINANCIAL BID CREATE/UPDATE
# ──────────────────────────────────────────────

class FinancialBidCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialBid
        fields = [
            'currency', 'total_amount', 'tax_amount',
            'discount', 'final_amount', 'pricing_breakdown',
        ]

    def validate(self, attrs):
        total = attrs.get('total_amount', 0)
        tax = attrs.get('tax_amount', 0)
        discount = attrs.get('discount', 0)
        final = attrs.get('final_amount', 0)

        expected_final = float(total) + float(tax) - float(discount)
        if abs(float(final) - expected_final) > 0.01:
            raise serializers.ValidationError({
                'final_amount': f'Final amount ({final}) does not match '
                f'total ({total}) + tax ({tax}) - discount ({discount}) = {expected_final}'
            })
        return attrs


# ──────────────────────────────────────────────
# BID DOCUMENT SERIALIZER
# ──────────────────────────────────────────────

class BidDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    verification_status_display = serializers.CharField(source='get_verification_status_display', read_only=True)

    class Meta:
        model = BidDocument
        fields = [
            'id', 'document_type', 'document_type_display',
            'original_filename', 'file_url', 'mime_type',
            'file_size', 'sha256_hash', 'version',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'verification_status', 'verification_status_display',
            'verified_at', 'rejection_reason',
        ]
        read_only_fields = [
            'id', 'sha256_hash', 'uploaded_by', 'uploaded_at',
            'verification_status', 'verified_at',
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.full_name
        return None


# ──────────────────────────────────────────────
# BID AMENDMENT SERIALIZER
# ──────────────────────────────────────────────

class BidAmendmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BidAmendment
        fields = [
            'id', 'amendment_number', 'reason', 'changes_description',
            'changed_sections', 'previous_version', 'new_version',
            'status', 'created_by', 'created_by_name',
            'created_at', 'submitted_at',
        ]
        read_only_fields = [
            'id', 'amendment_number', 'previous_version', 'new_version',
            'created_at', 'submitted_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


# ──────────────────────────────────────────────
# BID WITHDRAWAL SERIALIZER
# ──────────────────────────────────────────────

class BidWithdrawalSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BidWithdrawal
        fields = [
            'id', 'reason', 'requested_by', 'requested_by_name',
            'status', 'approved_by', 'approved_by_name',
            'approval_remarks', 'requested_at', 'processed_at',
        ]
        read_only_fields = ['id', 'requested_by', 'status', 'approved_by', 'requested_at', 'processed_at']

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.full_name
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.full_name
        return None


# ──────────────────────────────────────────────
# BID VERSION SERIALIZER
# ──────────────────────────────────────────────

class BidVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BidVersion
        fields = [
            'id', 'version_number', 'change_summary', 'change_type',
            'created_by', 'created_by_name',
            'integrity_hash', 'created_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


# ──────────────────────────────────────────────
# BID OPENING SERIALIZER
# ──────────────────────────────────────────────

class BidOpeningSerializer(serializers.ModelSerializer):
    authorized_by_tech_name = serializers.SerializerMethodField()
    authorized_by_fin_name = serializers.SerializerMethodField()
    tender_title = serializers.SerializerMethodField()
    tender_number = serializers.SerializerMethodField()
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    class Meta:
        model = BidOpening
        fields = [
            'id', 'tender', 'tender_title', 'tender_number',
            'stage', 'stage_display',
            'total_bids_received', 'total_bids_locked',
            'integrity_checks_passed', 'integrity_checks_failed',
            'technical_opening_authorized_by', 'technical_opening_authorized_at',
            'technical_opened_at', 'technical_opening_notes',
            'authorized_by_tech_name',
            'financial_opening_authorized_by', 'financial_opening_authorized_at',
            'financial_opened_at', 'financial_opening_notes',
            'authorized_by_fin_name',
            'created_at', 'updated_at',
        ]

    def get_tender_title(self, obj):
        return obj.tender.title if obj.tender else None

    def get_tender_number(self, obj):
        return obj.tender.tender_number if obj.tender else None

    def get_authorized_by_tech_name(self, obj):
        if obj.technical_opening_authorized_by:
            return obj.technical_opening_authorized_by.full_name
        return None

    def get_authorized_by_fin_name(self, obj):
        if obj.financial_opening_authorized_by:
            return obj.financial_opening_authorized_by.full_name
        return None


class BidOpeningAuthorizationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = BidOpeningAuthorization
        fields = [
            'id', 'user', 'user_name', 'role_in_opening',
            'authorized_at', 'authorized_by', 'is_active',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return None


# ──────────────────────────────────────────────
# BID ACCESS LOG SERIALIZER
# ──────────────────────────────────────────────

class BidAccessLogSerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()

    class Meta:
        model = BidAccessLog
        fields = [
            'id', 'bid', 'actor', 'actor_display', 'actor_role',
            'action', 'resource_type', 'resource_id',
            'resource_reference', 'outcome',
            'ip_address', 'correlation_id', 'timestamp',
        ]

    def get_actor_display(self, obj):
        return obj.actor_name or 'System'


# ──────────────────────────────────────────────
# BID INTEGRITY SERIALIZER
# ──────────────────────────────────────────────

class BidIntegrityRecordSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BidIntegrityRecord
        fields = [
            'id', 'integrity_hash', 'status',
            'verified_at', 'verified_by', 'verified_by_name',
            'verification_notes', 'created_at',
        ]

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.full_name
        return None


# ──────────────────────────────────────────────
# BID DASHBOARD SERIALIZER
# ──────────────────────────────────────────────

class BidDashboardSerializer(serializers.Serializer):
    total_bids = serializers.IntegerField()
    draft_bids = serializers.IntegerField()
    submitted_bids = serializers.IntegerField()
    under_evaluation_bids = serializers.IntegerField()
    awarded_bids = serializers.IntegerField()
    rejected_bids = serializers.IntegerField()
    withdrawn_bids = serializers.IntegerField()
    recent_bids = BidListSerializer(many=True)
