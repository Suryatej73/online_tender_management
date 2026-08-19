import json
from django.db.models import Q, Sum, Count
from django.utils import timezone

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

from .models import (
    TenderStatus, TenderCategory, TenderTemplate,
    Tender, BOQItem, TenderAmendment, TenderDocument
)
from .serializers import (
    TenderCategorySerializer, TenderTemplateSerializer,
    TenderListSerializer, TenderDetailSerializer, TenderCreateUpdateSerializer,
    BOQItemSerializer, TenderAmendmentSerializer, TenderDocumentSerializer
)
from accounts.models import UserRole


def get_request_data(request):
    if hasattr(request, 'data') and request.data:
        return request.data
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return {}


def get_current_user(request):
    """Extract current user from request (handles both JWT and session auth)."""
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


def log_tender_activity(user, action, tender, details=None):
    """Record tender-related activity."""
    from accounts.models import UserActivity, ActivityStatus
    if user and hasattr(user, 'id'):
        UserActivity.objects.create(
            user=user,
            action=action,
            resource=f"Tender: {tender.tender_number}",
            details=details or action,
            status=ActivityStatus.SUCCESS
        )


def seed_default_categories():
    """Seed default tender categories if none exist."""
    if TenderCategory.objects.exists():
        return

    categories = [
        ("IT Infrastructure", "IT_INFRA", "Information Technology systems, servers, networking"),
        ("Civil Construction", "CIVIL", "Roads, bridges, buildings, and civil works"),
        ("Energy & Utilities", "ENERGY", "Power plants, solar, wind, utility infrastructure"),
        ("Healthcare & Medical", "HEALTH", "Medical equipment, hospital supplies, pharmaceuticals"),
        ("Office Supplies & Furniture", "OFFICE", "Office equipment, furniture, stationery"),
        ("Consulting Services", "CONSULT", "Advisory, legal, financial, and management consulting"),
        ("Security Services", "SECURITY", "Physical security, cybersecurity, surveillance systems"),
        ("Transport & Logistics", "TRANSPORT", "Fleet, logistics, warehousing, supply chain"),
    ]

    for name, code, desc in categories:
        TenderCategory.objects.get_or_create(
            code=code,
            defaults={"name": name, "description": desc}
        )


def seed_default_templates():
    """Seed default tender templates if none exist."""
    if TenderTemplate.objects.exists():
        return

    templates = [
        {
            "name": "Standard IT Procurement",
            "description": "Standard template for IT hardware and software procurement tenders",
            "default_terms": "Payment: 30% advance, 70% on delivery.\nWarranty: Minimum 12 months.\nDelivery: Within 45 days of PO.",
            "default_requirements": "Technical compliance score >= 70%\nFinancial proposal within 15% of estimated cost\nISO 9001 certification required"
        },
        {
            "name": "Civil Works Tender",
            "description": "Template for construction and civil works procurement",
            "default_terms": "Payment: Milestone-based (30/40/30).\nPerformance Bank Guarantee: 10% of contract value.\nDefect Liability Period: 24 months.",
            "default_requirements": "Class A contractor license required\nMinimum 5 similar projects completed\nFinancial capacity >= 2x estimated cost"
        },
        {
            "name": "Service Contract (Consulting)",
            "description": "Template for consulting and professional service contracts",
            "default_terms": "Payment: Monthly against approved timesheets.\nContract Duration: 12 months (renewable).\nTermination: 30 days notice.",
            "default_requirements": "Relevant professional certifications\nMinimum 10 years experience in domain\nQualiCube or equivalent evaluation method"
        },
    ]

    for tpl in templates:
        TenderTemplate.objects.get_or_create(
            name=tpl["name"],
            defaults=tpl
        )


# ─── Tender CRUD Views ───

class TenderListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_categories()
        seed_default_templates()

        queryset = Tender.objects.filter(is_deleted=False)

        # ── Search & Filtering ──
        search = request.GET.get('search', '').strip()
        tender_status = request.GET.get('status', '').strip()
        category = request.GET.get('category', '').strip()
        org = request.GET.get('organization', '').strip()
        is_two_envelope = request.GET.get('is_two_envelope', '').strip()
        is_reverse_auction = request.GET.get('is_reverse_auction', '').strip()
        min_cost = request.GET.get('min_cost', '').strip()
        max_cost = request.GET.get('max_cost', '').strip()
        sort_by = request.GET.get('sort_by', '-created_at').strip()
        expiring_soon = request.GET.get('expiring_soon', '').strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(tender_number__icontains=search) |
                Q(organization_name__icontains=search) |
                Q(location__icontains=search)
            )

        if tender_status:
            queryset = queryset.filter(status=tender_status)

        if category:
            try:
                import uuid as _uuid
                _uuid.UUID(category)
                queryset = queryset.filter(Q(category_id=category) | Q(category__name__icontains=category))
            except (ValueError, TypeError):
                queryset = queryset.filter(Q(category__name__icontains=category) | Q(category__code__icontains=category))

        if org:
            try:
                import uuid as _uuid
                _uuid.UUID(org)
                queryset = queryset.filter(Q(organization_id=org) | Q(organization_name__icontains=org))
            except (ValueError, TypeError):
                queryset = queryset.filter(Q(organization_name__icontains=org))

        if is_two_envelope:
            queryset = queryset.filter(is_two_envelope=(is_two_envelope.lower() == 'true'))

        if is_reverse_auction:
            queryset = queryset.filter(is_reverse_auction_eligible=(is_reverse_auction.lower() == 'true'))

        if min_cost:
            try:
                queryset = queryset.filter(estimated_cost__gte=float(min_cost))
            except (ValueError, TypeError):
                pass

        if max_cost:
            try:
                queryset = queryset.filter(estimated_cost__lte=float(max_cost))
            except (ValueError, TypeError):
                pass

        if expiring_soon:
            try:
                days = int(expiring_soon)
                deadline_threshold = timezone.now() + timezone.timedelta(days=days)
                queryset = queryset.filter(submission_deadline__lte=deadline_threshold, submission_deadline__gte=timezone.now())
            except (ValueError, TypeError):
                pass

        # Sorting
        valid_sort_fields = [
            'created_at', '-created_at', 'title', '-title',
            'estimated_cost', '-estimated_cost', 'submission_deadline',
            '-submission_deadline', 'status', '-status', 'tender_number', '-tender_number'
        ]
        if sort_by in valid_sort_fields:
            queryset = queryset.order_by(sort_by)

        # ── Metrics ──
        all_tenders = Tender.objects.filter(is_deleted=False)
        metrics = {
            'total': all_tenders.count(),
            'draft': all_tenders.filter(status=TenderStatus.DRAFT).count(),
            'published': all_tenders.filter(status=TenderStatus.PUBLISHED).count(),
            'active': all_tenders.filter(status=TenderStatus.ACTIVE).count(),
            'evaluation': all_tenders.filter(status=TenderStatus.EVALUATION).count(),
            'awarded': all_tenders.filter(status=TenderStatus.AWARDED).count(),
            'closed': all_tenders.filter(status=TenderStatus.CLOSED).count(),
            'total_estimated_value': str(all_tenders.aggregate(total=Sum('estimated_cost'))['total'] or 0),
            'expiring_within_7_days': all_tenders.filter(
                submission_deadline__lte=timezone.now() + timezone.timedelta(days=7),
                submission_deadline__gte=timezone.now()
            ).count(),
        }

        serializer = TenderListSerializer(queryset, many=True)
        return Response({
            'metrics': metrics,
            'count': queryset.count(),
            'tenders': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        user = get_current_user(request)
        data = get_request_data(request)
        serializer = TenderCreateUpdateSerializer(data=data)

        if serializer.is_valid():
            tender = serializer.save(created_by=user)
            if user:
                log_tender_activity(user, "Created Tender", tender, f"Title: {tender.title}")
            return Response(TenderDetailSerializer(tender).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            tender = Tender.objects.get(pk=pk, is_deleted=False)
            return Response(TenderDetailSerializer(tender).data, status=status.HTTP_200_OK)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        if tender.status not in [TenderStatus.DRAFT]:
            return Response(
                {"error": "Only Draft tenders can be edited. Use amendment for published/active tenders."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = get_request_data(request)
        # Don't allow boq_items through PATCH (use separate endpoint)
        data.pop('boq_items', None)
        serializer = TenderCreateUpdateSerializer(tender, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            if user:
                log_tender_activity(user, "Updated Tender", tender, f"Updated fields: {', '.join(data.keys())}")
            return Response(TenderDetailSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=pk)
            if tender.status != TenderStatus.DRAFT:
                return Response(
                    {"error": "Only Draft tenders can be deleted. Cancel published tenders instead."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            tender.is_deleted = True
            tender.save()
            if user:
                log_tender_activity(user, "Deleted Tender", tender, f"Soft-deleted tender {tender.tender_number}")
            return Response({"message": f"Tender {tender.tender_number} deleted."}, status=status.HTTP_200_OK)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)


# ─── Lifecycle Management ───

class TenderLifecycleView(APIView):
    """Transition tender through lifecycle: Draft → Published → Active → Evaluation → Awarded → Closed"""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        new_status = data.get('status', '').strip().upper()

        if not new_status:
            return Response({"error": "Provide 'status' in request body."}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [s[0] for s in TenderStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Valid: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tender.transition_to(new_status, user=user)
            if user:
                log_tender_activity(
                    user, f"Transitioned Tender to {new_status}", tender,
                    f"Status changed: {tender.status} → {new_status}"
                )
            return Response({
                "message": f"Tender {tender.tender_number} transitioned to {new_status}.",
                "tender": TenderDetailSerializer(tender).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TenderBulkStatusView(APIView):
    """Bulk transition multiple tenders to a new status."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = get_current_user(request)
        data = get_request_data(request)
        tender_ids = data.get('tender_ids', [])
        new_status = data.get('status', '').strip().upper()

        if not tender_ids or not new_status:
            return Response(
                {"error": "Provide 'tender_ids' (list) and 'status' in request body."},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []
        for tid in tender_ids:
            try:
                tender = Tender.objects.get(id=tid, is_deleted=False)
                tender.transition_to(new_status, user=user)
                results.append({"tender_number": tender.tender_number, "status": "success"})
            except Tender.DoesNotExist:
                results.append({"id": tid, "status": "not_found"})
            except ValueError as e:
                results.append({"tender_number": tid, "status": "error", "message": str(e)})

        return Response({"results": results}, status=status.HTTP_200_OK)


# ─── BOQ Management ───

class BOQItemListCreateView(APIView):
    """List or add BOQ items to a tender."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, tender_pk):
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        items = tender.boq_items.all()
        total = items.aggregate(total=Sum('total_price'))['total'] or 0
        serializer = BOQItemSerializer(items, many=True)
        return Response({
            "tender_number": tender.tender_number,
            "total_boq_value": str(total),
            "item_count": items.count(),
            "items": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, tender_pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        data['tender'] = str(tender.pk)
        serializer = BOQItemSerializer(data=data)
        if serializer.is_valid():
            item = serializer.save()
            if user:
                log_tender_activity(user, "Added BOQ Item", tender, f"Item #{item.item_number}: {item.description[:50]}")
            return Response(BOQItemSerializer(item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BOQItemDetailView(APIView):
    """Update or delete a specific BOQ item."""
    permission_classes = [permissions.AllowAny]

    def patch(self, request, tender_pk, item_pk):
        try:
            item = BOQItem.objects.get(pk=item_pk, tender_id=tender_pk)
        except BOQItem.DoesNotExist:
            return Response({"error": "BOQ item not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        serializer = BOQItemSerializer(item, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(BOQItemSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, tender_pk, item_pk):
        try:
            item = BOQItem.objects.get(pk=item_pk, tender_id=tender_pk)
            item.delete()
            return Response({"message": "BOQ item deleted."}, status=status.HTTP_200_OK)
        except BOQItem.DoesNotExist:
            return Response({"error": "BOQ item not found."}, status=status.HTTP_404_NOT_FOUND)


# ─── Amendment Management ───

class TenderAmendmentListView(APIView):
    """List amendments for a tender."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, tender_pk):
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        amendments = tender.amendments.all()
        serializer = TenderAmendmentSerializer(amendments, many=True)
        return Response({
            "tender_number": tender.tender_number,
            "amendment_count": amendments.count(),
            "amendments": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, tender_pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        if tender.status == TenderStatus.DRAFT:
            return Response(
                {"error": "Cannot amend a Draft tender. Edit it directly or publish first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = get_request_data(request)
        data['tender'] = str(tender.pk)
        serializer = TenderAmendmentSerializer(data=data)
        if serializer.is_valid():
            amendment = serializer.save(created_by=user)
            # Bump tender version
            tender.version += 1
            tender.save(update_fields=['version', 'updated_at'])
            if user:
                log_tender_activity(user, "Created Amendment", tender, f"Amendment #{amendment.amendment_number}: {amendment.title}")
            return Response(TenderAmendmentSerializer(amendment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Tender Documents ───

class TenderDocumentListView(APIView):
    """List documents for a tender."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, tender_pk):
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        docs = tender.documents.all()
        serializer = TenderDocumentSerializer(docs, many=True)
        return Response({
            "tender_number": tender.tender_number,
            "document_count": docs.count(),
            "documents": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, tender_pk):
        user = get_current_user(request)
        try:
            tender = Tender.objects.get(pk=tender_pk, is_deleted=False)
        except Tender.DoesNotExist:
            return Response({"error": "Tender not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        data['tender'] = str(tender.pk)
        serializer = TenderDocumentSerializer(data=data)
        if serializer.is_valid():
            doc = serializer.save(uploaded_by=user)
            return Response(TenderDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Categories ───

class TenderCategoryListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_categories()
        categories = TenderCategory.objects.filter(is_active=True)
        serializer = TenderCategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = get_request_data(request)
        serializer = TenderCategorySerializer(data=data)
        if serializer.is_valid():
            category = serializer.save()
            return Response(TenderCategorySerializer(category).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenderCategoryDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            cat = TenderCategory.objects.get(pk=pk)
            return Response(TenderCategorySerializer(cat).data, status=status.HTTP_200_OK)
        except TenderCategory.DoesNotExist:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            cat = TenderCategory.objects.get(pk=pk)
        except TenderCategory.DoesNotExist:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        serializer = TenderCategorySerializer(cat, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(TenderCategorySerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            cat = TenderCategory.objects.get(pk=pk)
            cat.is_active = False
            cat.save()
            return Response({"message": f"Category '{cat.name}' deactivated."}, status=status.HTTP_200_OK)
        except TenderCategory.DoesNotExist:
            return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)


# ─── Templates ───

class TenderTemplateListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_templates()
        templates = TenderTemplate.objects.filter(is_active=True)
        serializer = TenderTemplateSerializer(templates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user = get_current_user(request)
        data = get_request_data(request)
        serializer = TenderTemplateSerializer(data=data)
        if serializer.is_valid():
            tpl = serializer.save(created_by=user)
            return Response(TenderTemplateSerializer(tpl).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenderTemplateDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            tpl = TenderTemplate.objects.get(pk=pk, is_active=True)
            return Response(TenderTemplateSerializer(tpl).data, status=status.HTTP_200_OK)
        except TenderTemplate.DoesNotExist:
            return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            tpl = TenderTemplate.objects.get(pk=pk)
        except TenderTemplate.DoesNotExist:
            return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        serializer = TenderTemplateSerializer(tpl, data=data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(TenderTemplateSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            tpl = TenderTemplate.objects.get(pk=pk)
            tpl.is_active = False
            tpl.save()
            return Response({"message": f"Template '{tpl.name}' deactivated."}, status=status.HTTP_200_OK)
        except TenderTemplate.DoesNotExist:
            return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)


class TenderTemplateCreateFromView(APIView):
    """Create a tender from a template, pre-populating fields."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        user = get_current_user(request)
        try:
            tpl = TenderTemplate.objects.get(pk=pk, is_active=True)
        except TenderTemplate.DoesNotExist:
            return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

        data = get_request_data(request)
        data['template'] = str(tpl.pk)
        if tpl.category and 'category' not in data:
            data['category'] = str(tpl.category.pk)
        if tpl.default_terms and 'description' not in data:
            data['description'] = tpl.default_terms

        serializer = TenderCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            tender = serializer.save(created_by=user)
            if user:
                log_tender_activity(user, "Created Tender from Template", tender, f"Template: {tpl.name}")
            return Response(TenderDetailSerializer(tender).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Dashboard Analytics ───

class TenderDashboardView(APIView):
    """Dashboard analytics for tender management overview."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        seed_default_categories()
        seed_default_templates()

        all_tenders = Tender.objects.filter(is_deleted=False)
        now = timezone.now()

        # Status breakdown
        status_counts = {}
        for s_code, s_label in TenderStatus.choices:
            status_counts[s_code] = all_tenders.filter(status=s_code).count()

        # Category breakdown
        category_stats = []
        for cat in TenderCategory.objects.filter(is_active=True):
            cat_tenders = cat.tenders.filter(is_deleted=False)
            category_stats.append({
                'category': cat.name,
                'code': cat.code,
                'count': cat_tenders.count(),
                'total_value': str(cat_tenders.aggregate(total=Sum('estimated_cost'))['total'] or 0),
            })

        # Timeline stats
        upcoming_deadlines = Tender.objects.filter(
            is_deleted=False,
            submission_deadline__gte=now,
            submission_deadline__lte=now + timezone.timedelta(days=30),
            status__in=[TenderStatus.PUBLISHED, TenderStatus.ACTIVE]
        ).order_by('submission_deadline')[:10]

        recent_tenders = all_tenders.order_by('-created_at')[:5]

        return Response({
            'summary': {
                'total_tenders': all_tenders.count(),
                'total_estimated_value': str(all_tenders.aggregate(total=Sum('estimated_cost'))['total'] or 0),
                'status_breakdown': status_counts,
                'categories': category_stats,
            },
            'upcoming_deadlines': TenderListSerializer(upcoming_deadlines, many=True).data,
            'recent_tenders': TenderListSerializer(recent_tenders, many=True).data,
            'templates_count': TenderTemplate.objects.filter(is_active=True).count(),
            'categories_count': TenderCategory.objects.filter(is_active=True).count(),
        }, status=status.HTTP_200_OK)
