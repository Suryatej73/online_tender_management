import uuid
import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Avg, Count, Sum, F
from django.db.models.functions import Coalesce

try:
    from rest_framework.views import APIView
    from rest_framework.response import Response
    from rest_framework import status, permissions
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
        return JsonResponse(data, status=status, safe=not isinstance(data, list))
    class permissions:
        class AllowAny: pass
        class IsAuthenticated: pass
    class status:
        HTTP_200_OK = 200
        HTTP_201_CREATED = 201
        HTTP_204_NO_CONTENT = 204
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404
        HTTP_409_CONFLICT = 409

from accounts.views import get_request_data
from accounts.models import UserRole, User

from .models import (
    Vendor, VendorDocument, VendorCategory, VendorCategoryAssignment,
    VendorCertification, VendorExperience, VendorRating, VendorReview,
    VendorPerformanceRecord, VendorStatusHistory, VendorBlacklist,
    VendorSuspension, VendorAuditLog, VendorNotification,
    VendorStatus, DocumentStatus, DocumentType, ReviewStatus, AuditAction, BlacklistStatus,
)
from .serializers import (
    VendorListSerializer, VendorDetailSerializer, VendorCreateUpdateSerializer,
    VendorDocumentSerializer, VendorCategorySerializer, VendorCategoryTreeSerializer,
    VendorCertificationSerializer, VendorExperienceSerializer,
    VendorRatingSerializer, VendorReviewSerializer, VendorPerformanceSerializer,
    VendorStatusHistorySerializer, VendorBlacklistSerializer,
    VendorSuspensionSerializer, VendorAuditLogSerializer, VendorNotificationSerializer,
)
from .permissions import IsAdminOnly, IsVendorUser, IsAdminOrReadOnly, IsOrganizationOrAdmin, has_vendor_permission
from .services import (
    VendorStatusService, VendorPerformanceService, VendorDocumentService,
    create_audit_log,
)


# ──────────────────────────────────────────────
# VENDOR DASHBOARD
# ──────────────────────────────────────────────

class VendorDashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total = Vendor.objects.filter(is_deleted=False).count()
        verified = Vendor.objects.filter(status=VendorStatus.VERIFIED).count()
        pending = Vendor.objects.filter(status=VendorStatus.PENDING_VERIFICATION).count()
        suspended = Vendor.objects.filter(status=VendorStatus.SUSPENDED).count()
        blacklisted = Vendor.objects.filter(status=VendorStatus.BLACKLISTED).count()

        avg_rating = Vendor.objects.filter(
            status=VendorStatus.VERIFIED, rating_count__gt=0
        ).aggregate(avg=Avg('overall_rating'))['avg'] or 0

        recent = VendorListSerializer(
            Vendor.objects.filter(is_deleted=False)[:5], many=True
        ).data

        top_performing = VendorListSerializer(
            Vendor.objects.filter(
                status=VendorStatus.VERIFIED, performance_score__gt=0
            ).order_by('-performance_score')[:5], many=True
        ).data

        from datetime import timedelta
        expiring_date = timezone.now().date() + timedelta(days=30)
        expiring_docs = VendorDocument.objects.filter(
            expiry_date__lte=expiring_date,
            expiry_date__gte=timezone.now().date(),
            status=DocumentStatus.VERIFIED,
        ).select_related('vendor')[:10]

        status_breakdown = {
            s: Vendor.objects.filter(status=s).count()
            for s, _ in VendorStatus.choices
        }

        category_breakdown = list(
            VendorCategoryAssignment.objects.values('category__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        return Response({
            "success": True,
            "data": {
                "total_vendors": total,
                "verified_vendors": verified,
                "pending_vendors": pending,
                "suspended_vendors": suspended,
                "blacklisted_vendors": blacklisted,
                "average_rating": round(float(avg_rating), 2),
                "recent_vendors": recent,
                "top_performing": top_performing,
                "expiring_documents": VendorDocumentSerializer(expiring_docs, many=True).data,
                "status_breakdown": status_breakdown,
                "category_breakdown": category_breakdown,
            }
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR CRUD
# ──────────────────────────────────────────────

class VendorListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = Vendor.objects.filter(is_deleted=False)

        # Filters
        search = request.GET.get('search', request.GET.get('q', '')).strip()
        vendor_status = request.GET.get('status', '').strip()
        category = request.GET.get('category', '').strip()
        city = request.GET.get('city', '').strip()
        country = request.GET.get('country', '').strip()
        min_rating = request.GET.get('minRating', '').strip()
        max_rating = request.GET.get('maxRating', '').strip()
        min_turnover = request.GET.get('minTurnover', '').strip()
        max_turnover = request.GET.get('maxTurnover', '').strip()
        sort_by = request.GET.get('sortBy', '-created_at').strip()
        order = request.GET.get('order', 'desc').strip()

        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(email__icontains=search) |
                Q(registration_number__icontains=search) |
                Q(industry__icontains=search) |
                Q(city__icontains=search)
            )
        if vendor_status:
            queryset = queryset.filter(status=vendor_status)
        if category:
            queryset = queryset.filter(category_assignments__category__slug=category).distinct()
        if city:
            queryset = queryset.filter(city__icontains=city)
        if country:
            queryset = queryset.filter(country__icontains=country)
        if min_rating:
            try:
                queryset = queryset.filter(overall_rating__gte=float(min_rating))
            except ValueError:
                pass
        if max_rating:
            try:
                queryset = queryset.filter(overall_rating__lte=float(max_rating))
            except ValueError:
                pass
        if min_turnover:
            try:
                queryset = queryset.filter(annual_turnover__gte=float(min_turnover))
            except ValueError:
                pass
        if max_turnover:
            try:
                queryset = queryset.filter(annual_turnover__lte=float(max_turnover))
            except ValueError:
                pass

        # Sorting
        allowed_sorts = [
            'created_at', '-created_at', 'company_name', '-company_name',
            'overall_rating', '-overall_rating', 'performance_score', '-performance_score',
            'completed_projects', '-completed_projects', 'updated_at', '-updated_at',
        ]
        if sort_by in allowed_sorts:
            queryset = queryset.order_by(sort_by)
        elif order.lower() == 'asc' and not sort_by.startswith('-'):
            if sort_by in allowed_sorts:
                queryset = queryset.order_by(sort_by)

        # Pagination
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        total = queryset.count()
        start = (page - 1) * limit
        end = start + limit

        serializer = VendorListSerializer(queryset[start:end], many=True)
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
        data = get_request_data(request)
        serializer = VendorCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            vendor = serializer.save()
            vendor.calculate_profile_completion()
            vendor.save()

            # Create status history
            VendorStatusHistory.objects.create(
                vendor=vendor,
                from_status=None,
                to_status=VendorStatus.PENDING_VERIFICATION,
                reason="Vendor registered"
            )

            # Create audit log
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.REGISTRATION,
                description=f"Vendor '{vendor.company_name}' registered successfully",
                request=request,
            )

            return Response({
                "success": True,
                "message": "Vendor registered successfully. Pending verification.",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class VendorDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            "success": True,
            "data": VendorDetailSerializer(vendor).data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        serializer = VendorCreateUpdateSerializer(vendor, data=data, partial=True)
        if serializer.is_valid():
            updated_vendor = serializer.save()
            updated_vendor.calculate_profile_completion()
            updated_vendor.save()

            create_audit_log(
                vendor=updated_vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.PROFILE_UPDATE,
                description=f"Vendor profile updated",
                request=request,
            )

            return Response({
                "success": True,
                "message": "Vendor profile updated successfully",
                "data": VendorDetailSerializer(updated_vendor).data
            }, status=status.HTTP_200_OK)

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        vendor.is_deleted = True
        vendor.status = VendorStatus.DEACTIVATED
        vendor.save()

        create_audit_log(
            vendor=vendor,
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            action=AuditAction.STATUS_CHANGE,
            description=f"Vendor soft-deleted / deactivated",
            request=request,
        )

        return Response({
            "success": True,
            "message": "Vendor deactivated successfully"
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR VERIFICATION (ADMIN)
# ──────────────────────────────────────────────

class VendorPendingListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        pending = Vendor.objects.filter(
            status=VendorStatus.PENDING_VERIFICATION,
            is_deleted=False
        )
        serializer = VendorListSerializer(pending, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": pending.count()
        }, status=status.HTTP_200_OK)


class VendorVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        reason = data.get('reason', 'Verification approved by admin')

        try:
            vendor = VendorStatusService.verify_vendor(
                vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason=reason,
            )
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.STATUS_CHANGE,
                description=f"Vendor verified: {vendor.company_name}",
                request=request,
            )
            return Response({
                "success": True,
                "message": f"Vendor '{vendor.company_name}' verified successfully",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorRejectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        reason = data.get('reason', 'Verification rejected')

        try:
            vendor = VendorStatusService.reject_vendor(
                vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason=reason,
            )
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.STATUS_CHANGE,
                description=f"Vendor rejected: {vendor.company_name}. Reason: {reason}",
                request=request,
            )
            return Response({
                "success": True,
                "message": f"Vendor '{vendor.company_name}' rejected",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ──────────────────────────────────────────────
# VENDOR DOCUMENTS
# ──────────────────────────────────────────────

class VendorDocumentListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        docs = vendor.documents.all()
        doc_status = request.GET.get('status', '').strip()
        if doc_status:
            docs = docs.filter(status=doc_status)

        serializer = VendorDocumentSerializer(docs, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": docs.count()
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        doc = VendorDocument.objects.create(
            vendor=vendor,
            document_type=data.get('document_type', DocumentType.OTHER),
            file_name=data.get('file_name', ''),
            file_url=data.get('file_url', ''),
            file_size=data.get('file_size', 0),
            file_type=data.get('file_type', 'PDF'),
            expiry_date=data.get('expiry_date'),
        )

        create_audit_log(
            vendor=vendor,
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            action=AuditAction.DOCUMENT_UPLOAD,
            description=f"Document uploaded: {doc.file_name} ({doc.get_document_type_display()})",
            request=request,
        )

        return Response({
            "success": True,
            "message": "Document uploaded successfully",
            "data": VendorDocumentSerializer(doc).data
        }, status=status.HTTP_201_CREATED)


class VendorDocumentDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def delete(self, request, pk, doc_id):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            doc = VendorDocument.objects.get(id=doc_id, vendor=vendor)
            doc.delete()
            return Response({
                "success": True,
                "message": "Document deleted successfully"
            }, status=status.HTTP_200_OK)
        except VendorDocument.DoesNotExist:
            return Response(
                {"success": False, "message": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class DocumentVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, doc_id):
        try:
            doc = VendorDocument.objects.get(id=doc_id)
        except VendorDocument.DoesNotExist:
            return Response(
                {"success": False, "message": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        action = data.get('action', 'verify')
        remarks = data.get('remarks', '')

        if action == 'verify':
            doc.status = DocumentStatus.VERIFIED
        elif action == 'reject':
            doc.status = DocumentStatus.REJECTED
        else:
            return Response(
                {"success": False, "message": "Action must be 'verify' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        doc.reviewer_remarks = remarks
        doc.verified_by = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        doc.verified_at = timezone.now()
        doc.save()

        create_audit_log(
            vendor=doc.vendor,
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            action=AuditAction.DOCUMENT_VERIFICATION if action == 'verify' else AuditAction.DOCUMENT_REJECTION,
            description=f"Document '{doc.file_name}' {action}ed. Remarks: {remarks}",
            request=request,
        )

        return Response({
            "success": True,
            "message": f"Document {action}ed successfully",
            "data": VendorDocumentSerializer(doc).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR CERTIFICATIONS
# ──────────────────────────────────────────────

class VendorCertificationListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        certs = vendor.certifications.all()
        serializer = VendorCertificationSerializer(certs, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": certs.count()
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        cert = VendorCertification.objects.create(vendor=vendor, **data)
        return Response({
            "success": True,
            "message": "Certification added successfully",
            "data": VendorCertificationSerializer(cert).data
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# VENDOR EXPERIENCE
# ──────────────────────────────────────────────

class VendorExperienceListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        exp = vendor.experience_records.all()
        serializer = VendorExperienceSerializer(exp, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": exp.count()
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        exp = VendorExperience.objects.create(vendor=vendor, **data)
        return Response({
            "success": True,
            "message": "Experience record added successfully",
            "data": VendorExperienceSerializer(exp).data
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# VENDOR CATEGORIES
# ──────────────────────────────────────────────

class VendorCategoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = VendorCategory.objects.filter(is_active=True, parent_category__isnull=True)
        serializer = VendorCategoryTreeSerializer(categories, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = get_request_data(request)
        serializer = VendorCategorySerializer(data=data)
        if serializer.is_valid():
            cat = serializer.save()
            return Response({
                "success": True,
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class VendorCategoryDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def put(self, request, pk):
        try:
            cat = VendorCategory.objects.get(id=pk)
        except VendorCategory.DoesNotExist:
            return Response(
                {"success": False, "message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        serializer = VendorCategorySerializer(cat, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            cat = VendorCategory.objects.get(id=pk)
        except VendorCategory.DoesNotExist:
            return Response(
                {"success": False, "message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        cat.is_active = False
        cat.save()
        return Response({
            "success": True,
            "message": "Category deactivated successfully"
        }, status=status.HTTP_200_OK)


class VendorAssignCategoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        category_id = data.get('category_id')
        try:
            category = VendorCategory.objects.get(id=category_id, is_active=True)
        except VendorCategory.DoesNotExist:
            return Response(
                {"success": False, "message": "Category not found or inactive"},
                status=status.HTTP_404_NOT_FOUND
            )

        assignment, created = VendorCategoryAssignment.objects.get_or_create(
            vendor=vendor,
            category=category,
            defaults={
                'specialization': data.get('specialization', ''),
                'skills': data.get('skills', []),
                'services_offered': data.get('services_offered', []),
                'is_primary': data.get('is_primary', False),
            }
        )

        if not created:
            return Response({
                "success": False,
                "message": "Category already assigned to this vendor"
            }, status=status.HTTP_409_CONFLICT)

        return Response({
            "success": True,
            "message": f"Category '{category.name}' assigned to vendor",
            "data": {"assignment_id": str(assignment.id)}
        }, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# VENDOR RATINGS
# ──────────────────────────────────────────────

class VendorRatingListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        ratings = vendor.ratings.all()
        serializer = VendorRatingSerializer(ratings, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": ratings.count(),
            "summary": {
                "overall": float(vendor.overall_rating),
                "quality": float(vendor.quality_rating),
                "technical": float(vendor.technical_rating),
                "timeliness": float(vendor.timeliness_rating),
                "communication": float(vendor.communication_rating),
                "compliance": float(vendor.compliance_rating),
                "total_ratings": vendor.rating_count,
            }
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        data['vendor'] = str(vendor.id)

        serializer = VendorRatingSerializer(data=data)
        if serializer.is_valid():
            rating = serializer.save()

            if hasattr(request, 'user') and request.user.is_authenticated:
                rating.rated_by = request.user
                if hasattr(request.user, 'organization'):
                    rating.organization = request.user.organization
                rating.save()

            # Update vendor aggregates
            VendorPerformanceService.update_vendor_aggregates(vendor)

            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.RATING_SUBMISSION,
                description=f"Rating submitted for vendor: {rating.average_score}/5.0 average",
                request=request,
            )

            return Response({
                "success": True,
                "message": "Rating submitted successfully",
                "data": VendorRatingSerializer(rating).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────
# VENDOR REVIEWS
# ──────────────────────────────────────────────

class VendorReviewListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        reviews = vendor.reviews.all()
        review_status = request.GET.get('status', '').strip()
        if review_status:
            reviews = reviews.filter(review_status=review_status)

        serializer = VendorReviewSerializer(reviews, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": reviews.count()
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        data['vendor'] = str(vendor.id)

        serializer = VendorReviewSerializer(data=data)
        if serializer.is_valid():
            review = serializer.save()

            if hasattr(request, 'user') and request.user.is_authenticated:
                review.review_by = request.user
                if hasattr(request.user, 'organization'):
                    review.organization = request.user.organization
                review.save()

            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.REVIEW_SUBMISSION,
                description=f"Review submitted for vendor: {review.comment[:100]}",
                request=request,
            )

            return Response({
                "success": True,
                "message": "Review submitted successfully",
                "data": VendorReviewSerializer(review).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ReviewModerateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, review_id):
        try:
            review = VendorReview.objects.get(id=review_id)
        except VendorReview.DoesNotExist:
            return Response(
                {"success": False, "message": "Review not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        new_status = data.get('status', '')
        remarks = data.get('remarks', '')

        if new_status not in [s[0] for s in ReviewStatus.choices]:
            return Response(
                {"success": False, "message": f"Invalid status: {new_status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        review.review_status = new_status
        review.moderation_remarks = remarks
        review.moderated_by = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        review.save()

        return Response({
            "success": True,
            "message": f"Review moderated: {new_status}",
            "data": VendorReviewSerializer(review).data
        }, status=status.HTTP_200_OK)


class VendorRespondReviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk, review_id):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            review = VendorReview.objects.get(id=review_id, vendor=vendor)
        except VendorReview.DoesNotExist:
            return Response(
                {"success": False, "message": "Review not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        response_text = data.get('response', '').strip()
        if not response_text:
            return Response(
                {"success": False, "message": "Response text is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        review.vendor_response = response_text
        review.vendor_response_date = timezone.now()
        review.save()

        return Response({
            "success": True,
            "message": "Response submitted successfully",
            "data": VendorReviewSerializer(review).data
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR PERFORMANCE
# ──────────────────────────────────────────────

class VendorPerformanceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Recalculate performance
        VendorPerformanceService.update_vendor_aggregates(vendor)

        records = VendorPerformanceRecord.objects.filter(vendor=vendor)
        serializer = VendorPerformanceSerializer(records, many=True)

        return Response({
            "success": True,
            "data": {
                "vendor_id": str(vendor.id),
                "vendor_name": vendor.company_name,
                "performance_score": float(vendor.performance_score),
                "completed_projects": vendor.completed_projects,
                "active_projects": vendor.active_projects,
                "on_time_percentage": float(vendor.on_time_percentage),
                "total_bids": vendor.total_bids,
                "won_bids": vendor.won_bids,
                "overall_rating": float(vendor.overall_rating),
                "quality_rating": float(vendor.quality_rating),
                "technical_rating": float(vendor.technical_rating),
                "timeliness_rating": float(vendor.timeliness_rating),
                "communication_rating": float(vendor.communication_rating),
                "compliance_rating": float(vendor.compliance_rating),
                "records": serializer.data,
            }
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR STATUS MANAGEMENT
# ──────────────────────────────────────────────

class VendorSuspendView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        reason = data.get('reason', '')
        remarks = data.get('remarks', '')
        end_date_str = data.get('end_date')

        if not reason:
            return Response(
                {"success": False, "message": "Reason is required for suspension"},
                status=status.HTTP_400_BAD_REQUEST
            )

        end_date = None
        if end_date_str:
            try:
                end_date = datetime.datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass

        try:
            vendor = VendorStatusService.suspend_vendor(
                vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason=reason,
                end_date=end_date,
                remarks=remarks,
            )
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.SUSPENSION,
                description=f"Vendor suspended: {reason}",
                request=request,
            )
            return Response({
                "success": True,
                "message": f"Vendor '{vendor.company_name}' suspended",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorBlacklistView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        reason = data.get('reason', '')
        description = data.get('description', '')
        is_permanent = data.get('is_permanent', False)
        evidence_file = data.get('evidence_file')
        end_date_str = data.get('end_date')

        if not reason:
            return Response(
                {"success": False, "message": "Reason is required for blacklisting"},
                status=status.HTTP_400_BAD_REQUEST
            )

        end_date = None
        if end_date_str:
            try:
                end_date = datetime.datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass

        try:
            vendor = VendorStatusService.blacklist_vendor(
                vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason=reason,
                description=description,
                end_date=end_date,
                is_permanent=is_permanent,
                evidence_file=evidence_file,
            )
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.BLACKLISTING,
                description=f"Vendor blacklisted: {reason} (permanent={is_permanent})",
                request=request,
            )
            return Response({
                "success": True,
                "message": f"Vendor '{vendor.company_name}' has been blacklisted",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorReinstateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        reason = data.get('reason', 'Reinstated by administrator')

        try:
            vendor = VendorStatusService.reinstate_vendor(
                vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason=reason,
            )
            create_audit_log(
                vendor=vendor,
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action=AuditAction.REINSTATEMENT,
                description=f"Vendor reinstated: {vendor.company_name}",
                request=request,
            )
            return Response({
                "success": True,
                "message": f"Vendor '{vendor.company_name}' reinstated to VERIFIED",
                "data": VendorDetailSerializer(vendor).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ──────────────────────────────────────────────
# VENDOR AUDIT LOGS
# ──────────────────────────────────────────────

class VendorAuditLogView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        queryset = VendorAuditLog.objects.all()
        if pk:
            try:
                vendor = Vendor.objects.get(id=pk)
                queryset = queryset.filter(vendor=vendor)
            except Vendor.DoesNotExist:
                return Response(
                    {"success": False, "message": "Vendor not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Filters
        action_filter = request.GET.get('action', '').strip()
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Pagination
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 50))
        total = queryset.count()
        start = (page - 1) * limit

        serializer = VendorAuditLogSerializer(queryset[start:start + limit], many=True)
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


# ──────────────────────────────────────────────
# VENDOR NOTIFICATIONS
# ──────────────────────────────────────────────

class VendorNotificationListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notifications = vendor.notifications.all()
        is_read = request.GET.get('is_read', '').strip()
        if is_read:
            notifications = notifications.filter(is_read=(is_read.lower() == 'true'))

        serializer = VendorNotificationSerializer(notifications[:50], many=True)
        unread_count = vendor.notifications.filter(is_read=False).count()
        return Response({
            "success": True,
            "data": serializer.data,
            "unread_count": unread_count
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        """Mark notifications as read."""
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        notification_ids = data.get('notification_ids', [])
        if notification_ids:
            vendor.notifications.filter(id__in=notification_ids).update(is_read=True)
        else:
            vendor.notifications.all().update(is_read=True)

        return Response({
            "success": True,
            "message": "Notifications marked as read"
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# BLACKLIST APPEAL
# ──────────────────────────────────────────────

class BlacklistAppealView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, blacklist_id):
        try:
            bl = VendorBlacklist.objects.get(id=blacklist_id, status=BlacklistStatus.ACTIVE)
        except VendorBlacklist.DoesNotExist:
            return Response(
                {"success": False, "message": "Active blacklist record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        data = get_request_data(request)
        remarks = data.get('appeal_remarks', '')

        if not remarks:
            return Response(
                {"success": False, "message": "Appeal remarks are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        bl.status = BlacklistStatus.APPEALED
        bl.appeal_remarks = remarks
        bl.save()

        return Response({
            "success": True,
            "message": "Blacklist appeal submitted for review"
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# VENDOR ELIGIBILITY CHECK
# ──────────────────────────────────────────────

class VendorEligibilityView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(id=pk, is_deleted=False)
        except Vendor.DoesNotExist:
            return Response(
                {"success": False, "message": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        eligible, reason = VendorStatusService.check_eligibility(vendor)
        return Response({
            "success": True,
            "data": {
                "eligible": eligible,
                "reason": reason,
                "status": vendor.status,
            }
        }, status=status.HTTP_200_OK)
