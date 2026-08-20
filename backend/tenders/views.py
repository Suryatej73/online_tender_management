import uuid
import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from accounts.views import get_request_data

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
        return JsonResponse(data, status=status)
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

from .models import (
    Tender, TenderCategory, TenderDocument, TenderStatusHistory,
    TenderTemplate, TenderAmendment, TenderVersion, TenderStatus, AmendmentStatus
)
from .serializers import (
    TenderSerializer, TenderCreateUpdateSerializer, TenderCategorySerializer,
    TenderCategoryTreeSerializer, TenderTemplateSerializer, TenderAmendmentSerializer,
    TenderVersionSerializer, TenderStatusHistorySerializer
)
from .services import TenderLifecycleService
from .permissions import IsTenderManagerOrAdmin, CanViewTender, CanEditTender


def generate_tender_number():
    year = timezone.now().year
    count = Tender.objects.filter(created_at__year=year).count() + 1
    return f"TND-{year}-{count:06d}"


class TenderListCreateView(APIView):
    permission_classes = [IsTenderManagerOrAdmin]

    def get(self, request):
        queryset = Tender.objects.filter(is_deleted=False)

        # Filters
        search = request.GET.get('search', request.GET.get('q', '')).strip()
        user_status = request.GET.get('status', '').strip()
        category_id = request.GET.get('category', request.GET.get('categoryId', '')).strip()
        org_id = request.GET.get('organization', request.GET.get('organizationId', '')).strip()
        min_budget = request.GET.get('minBudget', '').strip()
        max_budget = request.GET.get('maxBudget', '').strip()
        sort_by = request.GET.get('sortBy', '-created_at').strip()
        order = request.GET.get('order', 'desc').strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(tender_number__icontains=search) |
                Q(description__icontains=search) |
                Q(organization_name__icontains=search)
            )

        if user_status:
            queryset = queryset.filter(status=user_status)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if org_id:
            queryset = queryset.filter(Q(organization_id=org_id) | Q(organization_name__icontains=org_id))
        if min_budget:
            try: queryset = queryset.filter(budget__gte=float(min_budget))
            except ValueError: pass
        if max_budget:
            try: queryset = queryset.filter(budget__lte=float(max_budget))
            except ValueError: pass

        if order.lower() == 'asc' and not sort_by.startswith('-'):
            sort_by = sort_by
        elif order.lower() == 'desc' and not sort_by.startswith('-'):
            sort_by = f"-{sort_by}"

        if sort_by in ['created_at', '-created_at', 'budget', '-budget', 'submission_deadline', '-submission_deadline', 'title', '-title']:
            queryset = queryset.order_by(sort_by)

        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        total = queryset.count()
        start = (page - 1) * limit
        end = start + limit

        serializer = TenderSerializer(queryset[start:end], many=True)
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
        serializer = TenderCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            tender_number = generate_tender_number()
            tender = serializer.save()
            tender.tender_number = tender_number
            tender.status = TenderStatus.DRAFT
            if hasattr(request, 'user') and request.user.is_authenticated:
                tender.created_by = request.user
                if hasattr(request.user, 'organization') and request.user.organization:
                    tender.organization = request.user.organization
            tender.save()

            TenderStatusHistory.objects.create(
                tender=tender,
                from_status="NONE",
                to_status=TenderStatus.DRAFT,
                changed_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                reason="Created initial draft tender"
            )

            return Response({
                "success": True,
                "message": "Tender created successfully as DRAFT",
                "data": TenderSerializer(tender).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class TenderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        history = TenderStatusHistory.objects.filter(tender=tender)
        versions = TenderVersion.objects.filter(tender=tender)

        return Response({
            "success": True,
            "data": {
                **TenderSerializer(tender).data,
                "status_history": TenderStatusHistorySerializer(history, many=True).data,
                "versions": TenderVersionSerializer(versions, many=True).data
            }
        }, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        if tender.status != TenderStatus.DRAFT:
            return Response({
                "success": False,
                "message": f"Published or active tenders cannot be edited directly. Current status is '{tender.status}'. Use amendments to update published tenders."
            }, status=status.HTTP_400_BAD_REQUEST)

        data = get_request_data(request)

        # Optimistic locking version check
        client_version = data.get('version')
        if client_version is not None and int(client_version) != tender.version:
            return Response({
                "success": False,
                "message": f"Version conflict error. Database version is {tender.version}, but client version was {client_version}. Refresh data before updating."
            }, status=status.HTTP_409_CONFLICT)

        serializer = TenderCreateUpdateSerializer(tender, data=data, partial=True)
        if serializer.is_valid():
            updated_tender = serializer.save()
            return Response({
                "success": True,
                "message": "Tender updated successfully",
                "data": TenderSerializer(updated_tender).data
            }, status=status.HTTP_200_OK)

        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        if tender.status != TenderStatus.DRAFT:
            return Response({
                "success": False,
                "message": f"Only DRAFT tenders can be deleted. Active tender status is '{tender.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        tender.is_deleted = True
        tender.deleted_at = timezone.now()
        tender.save()

        return Response({
            "success": True,
            "message": "Tender deleted successfully"
        }, status=status.HTTP_200_OK)


class TenderTransitionView(APIView):
    permission_classes = [IsTenderManagerOrAdmin]

    def post(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        target_status = data.get('targetStatus', data.get('target_status', data.get('status')))
        reason = data.get('reason', '')

        if not target_status:
            return Response({"success": False, "message": "targetStatus parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
            updated_tender = TenderLifecycleService.transition_tender(tender, target_status, user=user, reason=reason)
            return Response({
                "success": True,
                "message": f"Tender successfully transitioned to '{updated_tender.status}'",
                "data": TenderSerializer(updated_tender).data
            }, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({
                "success": False,
                "message": str(exc)
            }, status=status.HTTP_400_BAD_REQUEST)


class TenderCategoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = TenderCategory.objects.filter(is_active=True, parent_category__isnull=True)
        serializer = TenderCategoryTreeSerializer(categories, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = get_request_data(request)
        serializer = TenderCategorySerializer(data=data)
        if serializer.is_valid():
            cat = serializer.save()
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class TenderCategoryDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def delete(self, request, pk):
        try:
            cat = TenderCategory.objects.get(id=pk)
        except TenderCategory.DoesNotExist:
            return Response({"success": False, "message": "Category not found"}, status=status.HTTP_404_NOT_FOUND)

        active_count = Tender.objects.filter(category=cat, is_deleted=False, status__in=[TenderStatus.PUBLISHED, TenderStatus.ACTIVE, TenderStatus.EVALUATION]).count()
        if active_count > 0:
            return Response({
                "success": False,
                "message": f"Cannot delete category '{cat.name}' because {active_count} active tenders are currently associated with it."
            }, status=status.HTTP_400_BAD_REQUEST)

        cat.is_active = False
        cat.save()
        return Response({"success": True, "message": "Category deactivated successfully"}, status=status.HTTP_200_OK)


class TenderTemplateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        templates = TenderTemplate.objects.all()
        serializer = TenderTemplateSerializer(templates, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        data = get_request_data(request)
        serializer = TenderTemplateSerializer(data=data)
        if serializer.is_valid():
            tmpl = serializer.save()
            if hasattr(request, 'user') and request.user.is_authenticated:
                tmpl.created_by = request.user
                tmpl.save()
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ApplyTemplateView(APIView):
    permission_classes = [IsTenderManagerOrAdmin]

    def post(self, request, pk):
        try:
            tmpl = TenderTemplate.objects.get(id=pk)
        except TenderTemplate.DoesNotExist:
            return Response({"success": False, "message": "Template not found"}, status=status.HTTP_404_NOT_FOUND)

        tmpl_data = tmpl.template_data or {}
        new_tender = Tender.objects.create(
            tender_number=generate_tender_number(),
            title=f"Draft - {tmpl.name}",
            description=tmpl_data.get("description", tmpl.description or "Tender created from template"),
            category=tmpl.category,
            status=TenderStatus.DRAFT,
            procurement_method=tmpl_data.get("procurementMethod", tmpl_data.get("procurement_method", "OPEN_TENDER")),
            eligibility_criteria=tmpl_data.get("eligibilityCriteria", tmpl_data.get("eligibility_criteria", "")),
            technical_requirements=tmpl_data.get("technicalRequirements", tmpl_data.get("technical_requirements", "")),
            financial_requirements=tmpl_data.get("financialRequirements", tmpl_data.get("financial_requirements", "")),
            bid_security_required=tmpl_data.get("bidSecurityRequired", False),
            created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        )

        TenderStatusHistory.objects.create(
            tender=new_tender,
            from_status="NONE",
            to_status=TenderStatus.DRAFT,
            changed_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            reason=f"Created from template '{tmpl.name}'"
        )

        return Response({
            "success": True,
            "message": f"New draft tender created from template '{tmpl.name}'",
            "data": TenderSerializer(new_tender).data
        }, status=status.HTTP_201_CREATED)


class TenderAmendmentView(APIView):
    permission_classes = [IsTenderManagerOrAdmin]

    def get(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        amendments = TenderAmendment.objects.filter(tender=tender)
        serializer = TenderAmendmentSerializer(amendments, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        if tender.status not in [TenderStatus.PUBLISHED, TenderStatus.ACTIVE]:
            return Response({
                "success": False,
                "message": f"Amendments can only be issued for PUBLISHED or ACTIVE tenders. Current status is '{tender.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        data = get_request_data(request)
        next_number = TenderAmendment.objects.filter(tender=tender).count() + 1

        amendment = TenderAmendment.objects.create(
            tender=tender,
            amendment_number=next_number,
            title=data.get('title', f"Amendment #{next_number}"),
            description=data.get('description', ''),
            reason=data.get('reason', 'Routine modification'),
            changes=data.get('changes', {}),
            previous_version=tender.version,
            new_version=tender.version + 1,
            status=AmendmentStatus.DRAFT,
            created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        )

        return Response({
            "success": True,
            "message": f"Amendment #{next_number} created as DRAFT",
            "data": TenderAmendmentSerializer(amendment).data
        }, status=status.HTTP_201_CREATED)


class PublishAmendmentView(APIView):
    permission_classes = [IsTenderManagerOrAdmin]

    @transaction.atomic
    def post(self, request, pk, aid):
        try:
            amendment = TenderAmendment.objects.get(id=aid, tender_id=pk)
        except TenderAmendment.DoesNotExist:
            return Response({"success": False, "message": "Amendment not found"}, status=status.HTTP_404_NOT_FOUND)

        if amendment.status == AmendmentStatus.PUBLISHED:
            return Response({"success": False, "message": "Amendment is already published"}, status=status.HTTP_400_BAD_REQUEST)

        tender = amendment.tender

        # Apply changes to tender
        changes = amendment.changes or {}
        for field, payload in changes.items():
            new_val = payload.get('newValue', payload.get('new_value', payload)) if isinstance(payload, dict) else payload
            if hasattr(tender, field):
                setattr(tender, field, new_val)

        # Increment Tender Version
        tender.version += 1
        tender.save()

        # Update amendment status
        amendment.status = AmendmentStatus.PUBLISHED
        amendment.published_at = timezone.now()
        amendment.save()

        # Create Version Snapshot
        TenderVersion.objects.create(
            tender=tender,
            version_number=tender.version,
            snapshot=TenderSerializer(tender).data,
            changed_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            change_type=f"AMENDMENT_#{amendment.amendment_number}"
        )

        return Response({
            "success": True,
            "message": f"Amendment #{amendment.amendment_number} published successfully! Tender version updated to v{tender.version}",
            "data": TenderSerializer(tender).data
        }, status=status.HTTP_200_OK)


class TenderVersionHistoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            tender = Tender.objects.get(id=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"success": False, "message": "Tender not found"}, status=status.HTTP_404_NOT_FOUND)

        versions = TenderVersion.objects.filter(tender=tender)
        serializer = TenderVersionSerializer(versions, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)
