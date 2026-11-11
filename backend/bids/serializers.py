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

            # SerializerMethodField methods
            for attr in dir(self):
                if attr.startswith('get_') and callable(getattr(self, attr)):
                    field_name = attr[4:]
                    try:
                        res[field_name] = getattr(self, attr)(item)
                    except Exception:
                        pass

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
                        except (serializers.ValidationError, _DummyValidationError, Exception) as e:
                            self._errors[field_name] = [str(getattr(e, 'detail', e))]
                elif attr_name == 'validate' and callable(getattr(self, attr_name)):
                    try:
                        self._data = getattr(self, attr_name)(self._data)
                    except (serializers.ValidationError, _DummyValidationError, Exception) as e:
                        self._errors['non_field_errors'] = [str(getattr(e, 'detail', e))]
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
            if self.instance is not None:
                for k, v in all_data.items():
                    if hasattr(self.instance, k):
                        setattr(self.instance, k, v)
                if hasattr(self.instance, 'save'):
                    self.instance.save()
                return self.instance
            elif hasattr(self, 'Meta') and hasattr(self.Meta, 'model'):
                model_cls = self.Meta.model
                valid_kwargs = {}
                for f in model_cls._meta.get_fields():
                    if getattr(f, 'is_relation', False):
                        if f.name in all_data:
                            val = all_data[f.name]
                            if val is not None and not hasattr(val, '_meta'):
                                valid_kwargs[getattr(f, 'attname', f"{f.name}_id")] = val
                            else:
                                valid_kwargs[f.name] = val
                        elif hasattr(f, 'attname') and f.attname in all_data:
                            valid_kwargs[f.attname] = all_data[f.attname]
                    elif hasattr(f, 'name') and f.name in all_data:
                        valid_kwargs[f.name] = all_data[f.name]
                self.instance = model_cls.objects.create(**valid_kwargs)
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
        FloatField = DummyField
        BooleanField = DummyField
        IntegerField = DummyField
        JSONField = DummyField
        ListField = DummyField
        DictField = DummyField
        SerializerMethodField = DummyField
        EmailField = DummyField
        URLField = DummyField
        ValidationError = _DummyValidationError


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
    """Safe bid serializer — includes vendor details and tender documents for evaluation."""
    tender_title = serializers.SerializerMethodField()
    tender_number = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_details = serializers.SerializerMethodField()
    tender_details = serializers.SerializerMethodField()
    tender_documents = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    document_count = serializers.SerializerMethodField()
    has_technical = serializers.SerializerMethodField()
    has_financial = serializers.SerializerMethodField()
    is_modifiable = serializers.SerializerMethodField()
    can_withdraw = serializers.SerializerMethodField()
    deadline_remaining = serializers.SerializerMethodField()
    technical_bid = serializers.SerializerMethodField()
    financial_bid = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()

    class Meta:
        model = Bid
        fields = [
            'id', 'bid_reference', 'status', 'status_display',
            'current_version', 'tender', 'tender_title', 'tender_number',
            'tender_details', 'tender_documents',
            'vendor', 'vendor_name', 'vendor_details',
            'submitted_at', 'locked_at', 'withdrawn_at',
            'document_count', 'has_technical', 'has_financial',
            'is_modifiable', 'can_withdraw', 'deadline_remaining',
            'technical_bid', 'financial_bid', 'documents',
            'created_at', 'updated_at',
        ]

    def get_tender_title(self, obj):
        return obj.tender.title if obj.tender else None

    def get_tender_number(self, obj):
        return obj.tender.tender_number if obj.tender else None

    def get_vendor_name(self, obj):
        if obj.vendor and obj.vendor.company_name:
            return obj.vendor.company_name
        if obj.created_by:
            return (
                getattr(obj.created_by, 'organization_name', None) or
                getattr(obj.created_by, 'full_name', None) or
                getattr(obj.created_by, 'email', None) or
                "Registered Vendor"
            )
        return "Registered Vendor"

    def get_vendor_details(self, obj):
        v = obj.vendor
        u = obj.created_by or (v.user if v else None)
        return {
            'id': str(v.id) if v else (str(u.id) if u else None),
            'company_name': (v.company_name if v and v.company_name else (getattr(u, 'organization_name', None) or getattr(u, 'full_name', None) or getattr(u, 'email', None) or 'Registered Vendor')),
            'registration_number': (getattr(v, 'registration_number', None) or 'VND-VERIFIED'),
            'tax_id': (getattr(v, 'tax_id', None) or 'TAX-REGISTERED'),
            'email': (v.email if v and v.email else (getattr(u, 'email', '') or '')),
            'phone': (getattr(v, 'phone', None) or getattr(u, 'phone_number', '') or ''),
            'country': (getattr(v, 'country', None) or 'India'),
            'address': (getattr(v, 'address', None) or ''),
            'is_verified': (getattr(v, 'status', None) == 'VERIFIED' if v else True)
        }

    def get_tender_documents(self, obj):
        if not obj.tender:
            return []
        try:
            from tenders.serializers import TenderDocumentSerializer
            docs = obj.tender.documents.all()
            return TenderDocumentSerializer(docs, many=True).data
        except Exception:
            return []

    def get_tender_details(self, obj):
        t = obj.tender
        if not t:
            return None
        return {
            'id': str(t.id),
            'tender_number': t.tender_number,
            'title': t.title,
            'description': t.description,
            'procurement_method': t.procurement_method,
            'budget': str(t.budget) if t.budget else '0',
            'currency': t.currency,
            'submission_deadline': t.submission_deadline.isoformat() if t.submission_deadline else None,
            'eligibility_criteria': t.eligibility_criteria,
            'technical_requirements': t.technical_requirements,
            'financial_requirements': t.financial_requirements,
            'manager_name': getattr(t.created_by, 'full_name', None) or 'Tender Manager',
            'manager_email': getattr(t.created_by, 'email', None) or '',
        }

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

    def get_technical_bid(self, obj):
        if hasattr(obj, 'technical_bid') and obj.technical_bid:
            return TechnicalBidSerializer(obj.technical_bid).data
        return None

    def get_documents(self, obj):
        docs = obj.documents.filter(is_deleted=False)
        return BidDocumentSerializer(docs, many=True).data

    def get_financial_bid(self, obj):
        if not hasattr(obj, 'financial_bid') or not obj.financial_bid:
            return None
        # Unseal financial pricing if bid has passed opening / evaluation stages
        if obj.status in [
            BidStatus.FINANCIAL_OPENED,
            BidStatus.EVALUATED,
            BidStatus.AWARDED,
            BidStatus.REJECTED,
            BidStatus.DISQUALIFIED,
        ]:
            fin = obj.financial_bid
            return {
                'final_amount': str(fin.final_amount),
                'currency': fin.currency,
                'discount': str(getattr(fin, 'discount', 0)),
                'discount_percentage': str(getattr(fin, 'discount', 0)),
            }
        return None

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
    """Bid detail — includes technical bid, vendor details, and tender specs."""
    tender_title = serializers.SerializerMethodField()
    tender_number = serializers.SerializerMethodField()
    tender_deadline = serializers.SerializerMethodField()
    tender_details = serializers.SerializerMethodField()
    tender_documents = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_company = serializers.SerializerMethodField()
    vendor_details = serializers.SerializerMethodField()
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
            'tender_details', 'tender_documents',
            'vendor', 'vendor_name', 'vendor_company', 'vendor_details',
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

    def get_tender_documents(self, obj):
        if not obj.tender:
            return []
        try:
            from tenders.serializers import TenderDocumentSerializer
            docs = obj.tender.documents.all()
            return TenderDocumentSerializer(docs, many=True).data
        except Exception:
            return []

    def get_tender_details(self, obj):
        t = obj.tender
        if not t:
            return None
        return {
            'id': str(t.id),
            'tender_number': t.tender_number,
            'title': t.title,
            'description': t.description,
            'procurement_method': t.procurement_method,
            'budget': str(t.budget) if t.budget else '0',
            'currency': t.currency,
            'submission_deadline': t.submission_deadline.isoformat() if t.submission_deadline else None,
            'eligibility_criteria': t.eligibility_criteria,
            'technical_requirements': t.technical_requirements,
            'financial_requirements': t.financial_requirements,
            'manager_name': getattr(t.created_by, 'full_name', None) or 'Tender Manager',
            'manager_email': getattr(t.created_by, 'email', None) or '',
        }

    def get_vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.company_name or obj.vendor.contact_person_name
        if obj.created_by:
            return (
                getattr(obj.created_by, 'organization_name', None) or
                getattr(obj.created_by, 'full_name', None) or
                getattr(obj.created_by, 'email', None) or
                "Registered Vendor"
            )
        return "Registered Vendor"

    def get_vendor_company(self, obj):
        return obj.vendor.company_name if obj.vendor else None

    def get_vendor_details(self, obj):
        v = obj.vendor
        u = obj.created_by or (v.user if v else None)
        return {
            'id': str(v.id) if v else (str(u.id) if u else None),
            'company_name': (v.company_name if v and v.company_name else (getattr(u, 'organization_name', None) or getattr(u, 'full_name', None) or getattr(u, 'email', None) or 'Registered Vendor')),
            'registration_number': (getattr(v, 'registration_number', None) or 'VND-VERIFIED'),
            'tax_id': (getattr(v, 'tax_id', None) or 'TAX-REGISTERED'),
            'email': (v.email if v and v.email else (getattr(u, 'email', '') or '')),
            'phone': (getattr(v, 'phone', None) or getattr(u, 'phone_number', '') or ''),
            'country': (getattr(v, 'country', None) or 'India'),
            'address': (getattr(v, 'address', None) or ''),
            'is_verified': (getattr(v, 'status', None) == 'VERIFIED' if v else True)
        }

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
