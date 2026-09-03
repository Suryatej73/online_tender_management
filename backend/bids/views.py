import uuid
import json
import hashlib
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count, Sum

try:
    from rest_framework.views import APIView
    from rest_framework.response import Response
    from rest_framework import status, permissions
    from rest_framework.parsers import MultiPartParser, FormParser
except ImportError:
    from django.views import View
    from django.http import JsonResponse
    class APIView(View):
        def dispatch(self, request, *args, **kwargs):
            handler = getattr(self, request.method.lower(), None)
            if handler:
                return handler(request, *args, **kwargs)
            return JsonResponse({'error': 'Method not allowed'}, status=405)
    def Response(data, status=200):
        return JsonResponse(data, status=status)
    class permissions:
        class AllowAny: pass
        class IsAuthenticated: pass
    class status:
        HTTP_200_OK = 200
        HTTP_201_CREATED = 201
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404
        HTTP_409_CONFLICT = 409
        HTTP_410_GONE = 410
    class MultiPartParser: pass
    class FormParser: pass

from accounts.views import get_request_data
from accounts.models import UserRole, User
from tenders.models import Tender, TenderStatus

from .models import (
    Bid, BidStatus, TechnicalBid, FinancialBid, BidDocument,
    BidAmendment, BidWithdrawal, BidOpening, BidOpeningAuthorization,
    BidAccessLog, BidIntegrityRecord, BidVersion,
    BidDocumentType, BidDocumentVerificationStatus, OpeningStage,
)
from .serializers import (
    BidListSerializer, BidDetailSerializer,
    TechnicalBidSerializer, TechnicalBidCreateUpdateSerializer,
    FinancialBidSealedSerializer, FinancialBidVendorSerializer,
    FinancialBidFullSerializer, FinancialBidCreateUpdateSerializer,
    BidDocumentSerializer, BidAmendmentSerializer,
    BidWithdrawalSerializer, BidVersionSerializer,
    BidOpeningSerializer, BidOpeningAuthorizationSerializer,
    BidAccessLogSerializer, BidIntegrityRecordSerializer,
)
from .services import BidLifecycleService, BidIntegrityService
from .permissions import (
    IsVendorOwner, CanSubmitBid, CanAmendBid,
    CanViewFinancialBid, CanOpenBids, CanAuthorizeFinancialOpening,
    CanUploadBidDocument, IsBidManagerOrAdmin, IsVendorOrAdmin,
)


def generate_bid_reference():
    year = timezone.now().year
    count = Bid.objects.filter(created_at__year=year).count() + 1
    return f"OTMS-BID-{year}-{count:05d}"


# ──────────────────────────────────────────────
# VENDOR BID DASHBOARD
# ──────────────────────────────────────────────

class BidDashboardView(APIView):
    """Vendor-facing and admin bid dashboard."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = getattr(request, 'user', None)
        is_authenticated = user and getattr(user, 'is_authenticated', False)

        if is_authenticated and user.role == UserRole.VENDOR:
            bids = Bid.objects.filter(vendor__user=user, is_deleted=False)
        elif is_authenticated and user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]:
            bids = Bid.objects.filter(is_deleted=False)
        else:
            bids = Bid.objects.filter(is_deleted=False)

        total = bids.count()
        draft = bids.filter(status=BidStatus.DRAFT).count()
        submitted = bids.filter(status=BidStatus.SUBMITTED).count()
        under_eval = bids.filter(status__in=[
            BidStatus.TECHNICAL_OPENED, BidStatus.TECHNICAL_EVALUATION,
            BidStatus.FINANCIAL_OPENING_AUTHORIZED, BidStatus.FINANCIAL_OPENED,
        ]).count()
        awarded = bids.filter(status=BidStatus.AWARDED).count()
        rejected = bids.filter(status__in=[BidStatus.REJECTED, BidStatus.DISQUALIFIED]).count()
        withdrawn = bids.filter(status=BidStatus.WITHDRAWN).count()

        recent = BidListSerializer(bids.order_by('-created_at')[:10], many=True).data

        return Response({
            "success": True,
            "data": {
                "total_bids": total,
                "draft_bids": draft,
                "submitted_bids": submitted,
                "under_evaluation_bids": under_eval,
                "awarded_bids": awarded,
                "rejected_bids": rejected,
                "withdrawn_bids": withdrawn,
                "recent_bids": recent,
            }
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID LIST & CREATE
# ──────────────────────────────────────────────

class BidListCreateView(APIView):
    """List vendor's bids or create a new bid."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = getattr(request, 'user', None)
        is_authenticated = user and getattr(user, 'is_authenticated', False)

        if is_authenticated and user.role == UserRole.VENDOR:
            bids = Bid.objects.filter(vendor__user=user, is_deleted=False)
        elif is_authenticated and user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER, UserRole.EVALUATOR]:
            bids = Bid.objects.filter(is_deleted=False)
        else:
            bids = Bid.objects.none()

        # Filters
        search = request.GET.get('search', '').strip()
        bid_status = request.GET.get('status', '').strip()
        tender_id = request.GET.get('tender', '').strip()

        if search:
            bids = bids.filter(
                Q(bid_reference__icontains=search) |
                Q(vendor__company_name__icontains=search) |
                Q(tender__title__icontains=search) |
                Q(tender__tender_number__icontains=search)
            )
        if bid_status:
            bids = bids.filter(status=bid_status)
        if tender_id:
            bids = bids.filter(tender_id=tender_id)

        bids = bids.order_by('-created_at')
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        total = bids.count()
        start = (page - 1) * limit
        end = start + limit

        serializer = BidListSerializer(bids[start:end], many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if limit > 0 else 1
            }
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new bid for a tender."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        data = get_request_data(request)
        tender_id = data.get('tender_id') or data.get('tender')

        if not tender_id:
            return Response({"success": False, "message": "tender_id is required."},
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            tender = Tender.objects.get(id=tender_id, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found."},
                          status=status.HTTP_404_NOT_FOUND)

        # Get vendor profile
        vendor = None
        if user.role == UserRole.VENDOR:
            try:
                from vendors.models import Vendor
                vendor = Vendor.objects.get(user=user, is_deleted=False)
            except Vendor.DoesNotExist:
                return Response({"success": False, "message": "Vendor profile not found."},
                              status=status.HTTP_404_NOT_FOUND)
        elif user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            vendor_id = data.get('vendor_id')
            if vendor_id:
                from vendors.models import Vendor
                try:
                    vendor = Vendor.objects.get(id=vendor_id, is_deleted=False)
                except Vendor.DoesNotExist:
                    return Response({"success": False, "message": "Vendor not found."},
                                  status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({"success": False, "message": "vendor_id is required for admin bid creation."},
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"success": False, "message": "Insufficient permissions."},
                          status=status.HTTP_403_FORBIDDEN)

        # Validate creation eligibility
        errors = BidLifecycleService.validate_creation(tender, vendor)
        if errors:
            return Response({"success": False, "message": " ".join(errors)},
                          status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            bid = Bid.objects.create(
                tender=tender,
                vendor=vendor,
                created_by=user,
                bid_reference=generate_bid_reference(),
                status=BidStatus.DRAFT,
            )

            BidAccessLog.log(
                bid=bid, actor=user, action='BID_CREATED',
                resource_id=str(bid.id),
                resource_reference=bid.bid_reference,
                request=request,
            )

        return Response({
            "success": True,
            "message": "Bid created successfully as DRAFT",
            "data": BidListSerializer(bid).data
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# BID DETAIL (GET/PATCH)
# ──────────────────────────────────────────────

class BidDetailView(APIView):
    """Get or update a bid."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.select_related('tender', 'vendor').prefetch_related(
                'documents', 'versions', 'amendments'
            ).get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        # Log access
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            BidAccessLog.log(
                bid=bid, actor=user, action='BID_VIEWED',
                resource_id=str(bid.id),
                resource_reference=bid.bid_reference,
                request=request,
            )

        return Response({
            "success": True,
            "data": BidDetailSerializer(bid).data
        }, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        """Update draft bid details (notes, etc)."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        can_modify, msg = BidLifecycleService.can_modify(bid, user)
        if not can_modify:
            return Response({"success": False, "message": msg},
                          status=status.HTTP_409_CONFLICT)

        data = get_request_data(request)
        notes = data.get('notes')
        if notes is not None:
            bid.notes = notes
            bid.save(update_fields=['notes', 'updated_at'])

        return Response({
            "success": True,
            "message": "Bid updated",
            "data": BidListSerializer(bid).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID SUBMISSION
# ──────────────────────────────────────────────

class BidSubmitView(APIView):
    """Submit a bid for evaluation."""
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, pk):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.select_for_update().get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        # Vendor can only submit own bids
        if user.role == UserRole.VENDOR and bid.vendor.user != user:
            return Response({"success": False, "message": "You can only submit your own bids."},
                          status=status.HTTP_403_FORBIDDEN)

        try:
            updated_bid = BidLifecycleService.transition_bid(
                bid, BidStatus.SUBMITTED, user=user, request=request
            )

            # Create integrity record
            BidIntegrityService.create_integrity_record(updated_bid)

            return Response({
                "success": True,
                "message": f"Bid {updated_bid.bid_reference} submitted successfully",
                "data": BidDetailSerializer(updated_bid).data
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"success": False, "message": str(e)},
                          status=status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────
# TECHNICAL BID API
# ──────────────────────────────────────────────

class TechnicalBidView(APIView):
    """Create or update technical bid for a bid."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        if not hasattr(bid, 'technical_bid'):
            return Response({"success": False, "message": "No technical proposal found."},
                          status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "data": TechnicalBidSerializer(bid.technical_bid).data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """Create or update technical bid."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        can_modify, msg = BidLifecycleService.can_modify(bid, user)
        if not can_modify:
            return Response({"success": False, "message": msg},
                          status=status.HTTP_409_CONFLICT)

        data = get_request_data(request)
        tech_bid, created = TechnicalBid.objects.update_or_create(
            bid=bid,
            defaults=data
        )

        BidAccessLog.log(
            bid=bid, actor=user,
            action='TECHNICAL_BID_UPDATED' if not created else 'TECHNICAL_BID_CREATED',
            resource_id=str(tech_bid.id),
            request=request,
        )

        return Response({
            "success": True,
            "message": "Technical proposal saved",
            "data": TechnicalBidSerializer(tech_bid).data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ──────────────────────────────────────────────
# FINANCIAL BID API (STRICT ACCESS CONTROL)
# ──────────────────────────────────────────────

class FinancialBidView(APIView):
    """
    Financial bid API with strict confidentiality enforcement.
    Before financial opening: only vendor sees own data.
    After opening: authorized users see full data.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        if not hasattr(bid, 'financial_bid'):
            return Response({"success": False, "message": "No financial proposal found."},
                          status=status.HTTP_404_NOT_FOUND)

        financial_bid = bid.financial_bid

        # Determine if financial data is "opened"
        is_opened = bid.status in [
            BidStatus.FINANCIAL_OPENED, BidStatus.EVALUATED,
            BidStatus.AWARDED, BidStatus.REJECTED, BidStatus.DISQUALIFIED,
        ]

        # Access control
        if user.role == UserRole.VENDOR:
            if bid.vendor.user != user:
                return Response({"success": False, "message": "Access denied."},
                              status=status.HTTP_403_FORBIDDEN)
            # Vendor always sees their own data
            serializer = FinancialBidVendorSerializer(financial_bid)
        elif is_opened:
            # After opening: authorized roles can see
            if user.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN,
                           UserRole.TENDER_MANAGER, UserRole.EVALUATOR]:
                serializer = FinancialBidFullSerializer(financial_bid)
            else:
                serializer = FinancialBidSealedSerializer(financial_bid)
        else:
            # Before opening: sealed
            if user.role == UserRole.SUPER_ADMIN:
                # Super admin can view for audit
                serializer = FinancialBidVendorSerializer(financial_bid)
            else:
                serializer = FinancialBidSealedSerializer(financial_bid)

        BidAccessLog.log(
            bid=bid, actor=user, action='FINANCIAL_BID_VIEWED',
            resource_id=str(financial_bid.id),
            metadata={'is_opened': is_opened, 'access_granted': True},
            request=request,
        )

        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """Create or update financial bid."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        can_modify, msg = BidLifecycleService.can_modify(bid, user)
        if not can_modify:
            return Response({"success": False, "message": msg},
                          status=status.HTTP_409_CONFLICT)

        # Vendor can only update own financial bid
        if user.role == UserRole.VENDOR and bid.vendor.user != user:
            return Response({"success": False, "message": "Access denied."},
                          status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request)
        serializer = FinancialBidCreateUpdateSerializer(data=data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors},
                          status=status.HTTP_400_BAD_REQUEST)

        fin_bid, created = FinancialBid.objects.update_or_create(
            bid=bid,
            defaults=serializer.validated_data
        )

        # Log WITHOUT financial data
        BidAccessLog.log(
            bid=bid, actor=user,
            action='FINANCIAL_BID_UPDATED' if not created else 'FINANCIAL_BID_CREATED',
            resource_id=str(fin_bid.id),
            metadata={'created': created},
            request=request,
        )

        return Response({
            "success": True,
            "message": "Financial proposal saved",
            "data": FinancialBidVendorSerializer(fin_bid).data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID DOCUMENT UPLOAD
# ──────────────────────────────────────────────

class BidDocumentListCreateView(APIView):
    """List and upload bid documents."""
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        docs = bid.documents.filter(is_deleted=False)
        doc_type = request.GET.get('type', '').strip()
        if doc_type:
            docs = docs.filter(document_type=doc_type)

        return Response({
            "success": True,
            "data": BidDocumentSerializer(docs, many=True).data,
            "count": docs.count(),
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        """Upload a document to a bid."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        can_modify, msg = BidLifecycleService.can_modify(bid, user)
        if not can_modify:
            return Response({"success": False, "message": msg},
                          status=status.HTTP_409_CONFLICT)

        # Vendor can only upload to own bid
        if user.role == UserRole.VENDOR and bid.vendor.user != user:
            return Response({"success": False, "message": "Access denied."},
                          status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request) if hasattr(request, 'data') else {}

        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/png',
            'image/jpeg',
        ]
        mime_type = data.get('mime_type', data.get('file_type', ''))
        if mime_type and mime_type not in allowed_types:
            return Response({
                "success": False,
                "message": f"File type '{mime_type}' not allowed. Accepted: PDF, DOCX, XLSX, PNG, JPG"
            }, status=status.HTTP_400_BAD_REQUEST)

        doc = BidDocument.objects.create(
            bid=bid,
            document_type=data.get('document_type', BidDocumentType.OTHER),
            original_filename=data.get('original_filename', data.get('file_name', 'unknown')),
            file_url=data.get('file_url', ''),
            storage_key=data.get('storage_key', ''),
            mime_type=mime_type,
            file_size=data.get('file_size', 0),
            sha256_hash=data.get('sha256_hash', ''),
            uploaded_by=user,
        )

        BidAccessLog.log(
            bid=bid, actor=user, action='DOCUMENT_UPLOADED',
            resource_id=str(doc.id),
            resource_reference=doc.original_filename,
            metadata={'document_type': doc.document_type, 'file_size': doc.file_size},
            request=request,
        )

        return Response({
            "success": True,
            "message": "Document uploaded successfully",
            "data": BidDocumentSerializer(doc).data
        }, status=status.HTTP_201_CREATED)


class BidDocumentDetailView(APIView):
    """Delete or verify a bid document."""
    permission_classes = [permissions.AllowAny]

    def delete(self, request, pk, doc_id):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
            doc = BidDocument.objects.get(id=doc_id, bid=bid)
        except (Bid.DoesNotExist, BidDocument.DoesNotExist):
            return Response({"success": False, "message": "Not found."},
                          status=status.HTTP_404_NOT_FOUND)

        can_modify, msg = BidLifecycleService.can_modify(bid, user)
        if not can_modify:
            return Response({"success": False, "message": msg},
                          status=status.HTTP_409_CONFLICT)

        doc.is_deleted = True
        doc.save(update_fields=['is_deleted'])

        return Response({"success": True, "message": "Document removed"},
                       status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID AMENDMENT
# ──────────────────────────────────────────────

class BidAmendView(APIView):
    """Create and submit bid amendments."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        amendments = bid.amendments.all()
        return Response({
            "success": True,
            "data": BidAmendmentSerializer(amendments, many=True).data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, pk):
        """Create a bid amendment."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.select_for_update().get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.VENDOR and bid.vendor.user != user:
            return Response({"success": False, "message": "You can only amend your own bids."},
                          status=status.HTTP_403_FORBIDDEN)

        # Check deadline
        if BidLifecycleService.check_deadline(bid.tender):
            return Response({"success": False, "message": "Submission deadline has passed. Amendments not allowed."},
                          status=status.HTTP_410_GONE)

        # Check if bid is in amendable state
        if bid.status not in [BidStatus.SUBMITTED, BidStatus.AMENDMENT_ALLOWED, BidStatus.AMENDMENT_SUBMITTED]:
            return Response({
                "success": False,
                "message": f"Bid cannot be amended in '{bid.status}' state."
            }, status=status.HTTP_409_CONFLICT)

        data = get_request_data(request)
        reason = data.get('reason', '')
        if not reason:
            return Response({"success": False, "message": "Amendment reason is required."},
                          status=status.HTTP_400_BAD_REQUEST)

        next_number = bid.amendments.count() + 1
        amendment = BidAmendment.objects.create(
            bid=bid,
            amendment_number=next_number,
            reason=reason,
            changes_description=data.get('changes_description', ''),
            changed_sections=data.get('changed_sections', []),
            previous_version=bid.current_version,
            new_version=bid.current_version + 1,
            status='SUBMITTED',
            created_by=user,
            submitted_at=timezone.now(),
        )

        # Transition bid to AMENDMENT_SUBMITTED
        try:
            BidLifecycleService.transition_bid(
                bid, BidStatus.AMENDMENT_SUBMITTED, user=user,
                reason=f"Amendment #{next_number}: {reason}",
                request=request,
            )
        except ValueError as e:
            return Response({"success": False, "message": str(e)},
                          status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": f"Amendment #{next_number} submitted",
            "data": BidAmendmentSerializer(amendment).data
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# BID WITHDRAWAL
# ──────────────────────────────────────────────

class BidWithdrawView(APIView):
    """Request bid withdrawal."""
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, pk):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.select_for_update().get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.VENDOR and bid.vendor.user != user:
            return Response({"success": False, "message": "You can only withdraw your own bids."},
                          status=status.HTTP_403_FORBIDDEN)

        if not bid.can_withdraw:
            return Response({
                "success": False,
                "message": f"Bid cannot be withdrawn in '{bid.status}' state."
            }, status=status.HTTP_409_CONFLICT)

        data = get_request_data(request)
        reason = data.get('reason', '')
        if not reason:
            return Response({"success": False, "message": "Withdrawal reason is required."},
                          status=status.HTTP_400_BAD_REQUEST)

        # Create withdrawal record
        withdrawal, created = BidWithdrawal.objects.get_or_create(
            bid=bid,
            defaults={
                'reason': reason,
                'requested_by': user,
                'status': 'APPROVED',  # Auto-approve vendor withdrawal
            }
        )

        if not created and withdrawal.status != 'PENDING':
            return Response({"success": False, "message": "Withdrawal already processed."},
                          status=status.HTTP_409_CONFLICT)

        # Transition bid to WITHDRAWN
        try:
            BidLifecycleService.transition_bid(
                bid, BidStatus.WITHDRAWN, user=user,
                reason=f"Withdrawal: {reason}",
                request=request,
            )
        except ValueError as e:
            return Response({"success": False, "message": str(e)},
                          status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": "Bid withdrawn successfully",
            "data": BidWithdrawalSerializer(withdrawal).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID VERSION HISTORY
# ──────────────────────────────────────────────

class BidVersionHistoryView(APIView):
    """View bid version history."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        versions = bid.versions.all()
        return Response({
            "success": True,
            "data": BidVersionSerializer(versions, many=True).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID OPENING WORKFLOW
# ──────────────────────────────────────────────

class BidOpeningView(APIView):
    """Admin bid opening workflow — authorize and execute technical/financial opening."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        """Get opening status for a tender."""
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found."},
                          status=status.HTTP_404_NOT_FOUND)

        opening, _ = BidOpening.objects.get_or_create(
            tender=tender,
            defaults={
                'total_bids_received': tender.bids.filter(is_deleted=False).count(),
                'total_bids_locked': tender.bids.filter(
                    status=BidStatus.LOCKED, is_deleted=False
                ).count(),
            }
        )

        # Update counts
        opening.total_bids_received = tender.bids.filter(is_deleted=False).count()
        opening.total_bids_locked = tender.bids.filter(
            status__in=[BidStatus.LOCKED, BidStatus.TECHNICAL_OPENED,
                       BidStatus.TECHNICAL_EVALUATION, BidStatus.FINANCIAL_OPENING_AUTHORIZED,
                       BidStatus.FINANCIAL_OPENED, BidStatus.EVALUATED,
                       BidStatus.AWARDED, BidStatus.REJECTED, BidStatus.DISQUALIFIED],
            is_deleted=False
        ).count()
        opening.integrity_checks_passed = BidIntegrityRecord.objects.filter(
            bid__tender=tender, status='VERIFIED'
        ).count()
        opening.integrity_checks_failed = BidIntegrityRecord.objects.filter(
            bid__tender=tender, status='FAILURE'
        ).count()
        opening.save()

        return Response({
            "success": True,
            "data": BidOpeningSerializer(opening).data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, pk):
        """Authorize or execute bid opening stages."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        if user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]:
            return Response({"success": False, "message": "Insufficient permissions for bid opening."},
                          status=status.HTTP_403_FORBIDDEN)

        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found."},
                          status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        action = data.get('action')  # 'authorize_technical', 'open_technical', 'authorize_financial', 'open_financial'

        if not action:
            return Response({"success": False, "message": "action parameter required."},
                          status=status.HTTP_400_BAD_REQUEST)

        opening, _ = BidOpening.objects.get_or_create(tender=tender)
        locked_bids = Bid.objects.filter(
            tender=tender, status=BidStatus.LOCKED, is_deleted=False
        )

        if action == 'authorize_technical':
            if user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]:
                return Response({"success": False, "message": "Unauthorized."},
                              status=status.HTTP_403_FORBIDDEN)

            opening.stage = OpeningStage.TECHNICAL_AUTHORIZED
            opening.technical_opening_authorized_by = user
            opening.technical_opening_authorized_at = timezone.now()
            opening.save()

            BidAccessLog.log(
                actor=user, action='TECHNICAL_OPENING_AUTHORIZED',
                resource_type='BidOpening', resource_id=str(opening.id),
                resource_reference=tender.tender_number,
                request=request,
            )

        elif action == 'open_technical':
            if opening.stage != OpeningStage.TECHNICAL_AUTHORIZED:
                return Response({"success": False, "message": "Technical opening not authorized."},
                              status=status.HTTP_400_BAD_REQUEST)

            # Verify integrity before opening
            integrity_passed = 0
            integrity_failed = 0
            for bid in locked_bids:
                result, _ = BidIntegrityService.verify_integrity(bid)
                if result:
                    integrity_passed += 1
                else:
                    integrity_failed += 1

            if integrity_failed > 0 and user.role != UserRole.SUPER_ADMIN:
                return Response({
                    "success": False,
                    "message": f"{integrity_failed} bid(s) failed integrity check. Super admin required to proceed."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Transition all locked bids to TECHNICAL_OPENED
            for bid in locked_bids:
                try:
                    BidLifecycleService.transition_bid(
                        bid, BidStatus.TECHNICAL_OPENED, user=user,
                        reason='Technical opening authorized',
                        request=request,
                    )
                except ValueError:
                    pass

            opening.stage = OpeningStage.TECHNICAL_OPENED
            opening.technical_opened_at = timezone.now()
            opening.technical_opening_notes = data.get('notes', '')
            opening.integrity_checks_passed = integrity_passed
            opening.integrity_checks_failed = integrity_failed
            opening.save()

            BidAccessLog.log(
                actor=user, action='TECHNICAL_OPENING_COMPLETED',
                resource_type='BidOpening', resource_id=str(opening.id),
                resource_reference=tender.tender_number,
                metadata={
                    'bids_opened': locked_bids.count(),
                    'integrity_passed': integrity_passed,
                    'integrity_failed': integrity_failed,
                },
                request=request,
            )

        elif action == 'authorize_financial':
            if user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
                return Response({"success": False, "message": "Only Super Admin or Org Admin can authorize financial opening."},
                              status=status.HTTP_403_FORBIDDEN)

            if opening.stage not in [OpeningStage.TECHNICAL_OPENED]:
                return Response({"success": False, "message": "Technical opening must be completed first."},
                              status=status.HTTP_400_BAD_REQUEST)

            opening.stage = OpeningStage.FINANCIAL_AUTHORIZED
            opening.financial_opening_authorized_by = user
            opening.financial_opening_authorized_at = timezone.now()
            opening.save()

            # Transition bids to FINANCIAL_OPENING_AUTHORIZED
            tech_opened_bids = Bid.objects.filter(
                tender=tender, status=BidStatus.TECHNICAL_EVALUATION, is_deleted=False
            )
            for bid in tech_opened_bids:
                try:
                    BidLifecycleService.transition_bid(
                        bid, BidStatus.FINANCIAL_OPENING_AUTHORIZED, user=user,
                        reason='Financial opening authorized',
                        request=request,
                    )
                except ValueError:
                    pass

            BidAccessLog.log(
                actor=user, action='FINANCIAL_OPENING_AUTHORIZED',
                resource_type='BidOpening', resource_id=str(opening.id),
                resource_reference=tender.tender_number,
                request=request,
            )

        elif action == 'open_financial':
            if opening.stage != OpeningStage.FINANCIAL_AUTHORIZED:
                return Response({"success": False, "message": "Financial opening not authorized."},
                              status=status.HTTP_400_BAD_REQUEST)

            # Open financial bids
            fin_auth_bids = Bid.objects.filter(
                tender=tender, status=BidStatus.FINANCIAL_OPENING_AUTHORIZED, is_deleted=False
            )
            opened_count = 0
            for bid in fin_auth_bids:
                try:
                    BidLifecycleService.transition_bid(
                        bid, BidStatus.FINANCIAL_OPENED, user=user,
                        reason='Financial opening',
                        request=request,
                    )
                    # Mark financial bid as opened
                    if hasattr(bid, 'financial_bid'):
                        bid.financial_bid.opened_at = timezone.now()
                        bid.financial_bid.opened_by = user
                        bid.financial_bid.save(update_fields=['opened_at', 'opened_by'])
                    opened_count += 1
                except ValueError:
                    pass

            opening.stage = OpeningStage.FINANCIAL_OPENED
            opening.financial_opened_at = timezone.now()
            opening.financial_opening_notes = data.get('notes', '')
            opening.save()

            BidAccessLog.log(
                actor=user, action='FINANCIAL_OPENING_COMPLETED',
                resource_type='BidOpening', resource_id=str(opening.id),
                resource_reference=tender.tender_number,
                metadata={'bids_opened': opened_count},
                request=request,
            )

        else:
            return Response({"success": False, "message": f"Unknown action: {action}"},
                          status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": f"Opening action '{action}' completed",
            "data": BidOpeningSerializer(opening).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID ACCESS LOG / AUDIT TRAIL
# ──────────────────────────────────────────────

class BidAccessLogView(APIView):
    """View bid audit logs."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        if pk:
            logs = BidAccessLog.objects.filter(bid_id=pk)
        else:
            logs = BidAccessLog.objects.all()

        # Filters
        action = request.GET.get('action', '').strip()
        actor_id = request.GET.get('actor', '').strip()
        outcome = request.GET.get('outcome', '').strip()

        if action:
            logs = logs.filter(action=action)
        if actor_id:
            logs = logs.filter(actor_id=actor_id)
        if outcome:
            logs = logs.filter(outcome=outcome)

        logs = logs[:100]  # Limit

        return Response({
            "success": True,
            "data": BidAccessLogSerializer(logs, many=True).data,
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BID INTEGRITY CHECK
# ──────────────────────────────────────────────

class BidIntegrityView(APIView):
    """Verify bid integrity."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        record = getattr(bid, 'integrity_record', None)
        if record:
            return Response({
                "success": True,
                "data": BidIntegrityRecordSerializer(record).data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": True,
                "data": {"status": "PENDING", "message": "No integrity record yet."}
            }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        """Trigger integrity verification."""
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return Response({"success": False, "message": "Authentication required."},
                          status=status.HTTP_401_UNAUTHORIZED)

        try:
            bid = Bid.objects.get(id=pk, is_deleted=False)
        except Bid.DoesNotExist:
            return Response({"success": False, "message": "Bid not found."},
                          status=status.HTTP_404_NOT_FOUND)

        passed, message = BidIntegrityService.verify_integrity(bid)
        record = getattr(bid, 'integrity_record', None)

        return Response({
            "success": passed,
            "message": message,
            "data": BidIntegrityRecordSerializer(record).data if record else None
        }, status=status.HTTP_200_OK if passed else status.HTTP_400_BAD_REQUEST)
