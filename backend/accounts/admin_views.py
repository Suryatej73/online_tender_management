import uuid
import csv
import json
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import get_user_model

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
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404

from .models import (
    UserRole, UserStatus, Organization, Department,
    UserSession, UserActivity, LoginAttempt, Complaint,
    ComplaintStatus, ComplaintPriority, RiskAlert, RiskStatus,
    RiskSeverity, PlatformAnnouncement, SystemSetting, PlatformAuditLog
)
from vendors.models import (
    Vendor, VendorStatus, VendorBlacklist, VendorSuspension,
    VendorStatusHistory, VendorDocument, VendorCategory
)
from tenders.models import Tender, TenderStatus, TenderCategory
from bids.models import Bid, BidStatus

User = get_user_model()


def get_request_data(request):
    if hasattr(request, 'data') and request.data:
        return request.data
    try:
        return json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return {}


def log_platform_audit(user, action, entity_type, entity_id=None, old_value=None, new_value=None, description=None, request=None):
    """Utility to log append-only administrative audit records."""
    user_email = user.email if (user and hasattr(user, 'email')) else 'System'
    user_role = user.role if (user and hasattr(user, 'role')) else 'ADMIN'
    ip = None
    user_agent = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        user_agent = request.META.get('HTTP_USER_AGENT')

    PlatformAuditLog.objects.create(
        user=user if (user and hasattr(user, 'id')) else None,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        old_value=old_value or {},
        new_value=new_value or {},
        description=description,
        ip_address=ip,
        user_agent=user_agent
    )


# ──────────────────────────────────────────────
# 1. ADMIN DASHBOARD & STATISTICS
# ──────────────────────────────────────────────

class AdminDashboardView(APIView):
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Users breakdown
        total_users = User.objects.filter(is_deleted=False).count()
        total_organizations = Organization.objects.count()
        total_vendors = Vendor.objects.filter(is_deleted=False).count()
        total_evaluators = User.objects.filter(role=UserRole.EVALUATOR, is_deleted=False).count()
        active_users = User.objects.filter(status=UserStatus.ACTIVE, is_deleted=False).count()
        suspended_users = User.objects.filter(status=UserStatus.SUSPENDED, is_deleted=False).count()
        pending_verifications = Vendor.objects.filter(status=VendorStatus.PENDING_VERIFICATION, is_deleted=False).count()

        # Tenders breakdown
        total_tenders = Tender.objects.filter(is_deleted=False).count()
        draft_tenders = Tender.objects.filter(status=TenderStatus.DRAFT, is_deleted=False).count()
        published_tenders = Tender.objects.filter(status=TenderStatus.PUBLISHED, is_deleted=False).count()
        open_tenders = Tender.objects.filter(status=TenderStatus.ACTIVE, is_deleted=False).count()
        evaluation_tenders = Tender.objects.filter(status=TenderStatus.EVALUATION, is_deleted=False).count()
        awarded_tenders = Tender.objects.filter(status=TenderStatus.AWARDED, is_deleted=False).count()
        closed_tenders = Tender.objects.filter(status=TenderStatus.CLOSED, is_deleted=False).count()
        cancelled_tenders = Tender.objects.filter(status=TenderStatus.CANCELLED, is_deleted=False).count()

        # Vendor status breakdown
        pending_vendors = Vendor.objects.filter(status=VendorStatus.PENDING_VERIFICATION, is_deleted=False).count()
        verified_vendors = Vendor.objects.filter(status=VendorStatus.VERIFIED, is_deleted=False).count()
        rejected_vendors = Vendor.objects.filter(status=VendorStatus.REJECTED, is_deleted=False).count()
        suspended_vendors = Vendor.objects.filter(status=VendorStatus.SUSPENDED, is_deleted=False).count()
        blacklisted_vendors = Vendor.objects.filter(status=VendorStatus.BLACKLISTED, is_deleted=False).count()

        # Bids & Daily Activity
        total_bids = Bid.objects.count()
        today_registrations = User.objects.filter(created_at__gte=today_start).count()
        today_tenders = Tender.objects.filter(created_at__gte=today_start).count()
        today_bids = Bid.objects.filter(created_at__gte=today_start).count()
        pending_complaints = Complaint.objects.filter(status__in=[ComplaintStatus.OPEN, ComplaintStatus.UNDER_REVIEW]).count()
        active_risk_alerts = RiskAlert.objects.filter(status__in=[RiskStatus.NEW, RiskStatus.INVESTIGATING]).count()

        # Recent activities
        recent_logs = list(PlatformAuditLog.objects.all()[:8].values(
            'id', 'user_email', 'action', 'entity_type', 'description', 'timestamp'
        ))

        return Response({
            'user_statistics': {
                'total_users': total_users,
                'total_organizations': total_organizations,
                'total_vendors': total_vendors,
                'total_evaluators': total_evaluators,
                'active_users': active_users,
                'suspended_users': suspended_users,
                'pending_verifications': pending_verifications
            },
            'tender_statistics': {
                'total_tenders': total_tenders,
                'draft_tenders': draft_tenders,
                'published_tenders': published_tenders,
                'open_tenders': open_tenders,
                'evaluation_tenders': evaluation_tenders,
                'awarded_tenders': awarded_tenders,
                'closed_tenders': closed_tenders,
                'cancelled_tenders': cancelled_tenders
            },
            'vendor_statistics': {
                'pending_vendors': pending_vendors,
                'verified_vendors': verified_vendors,
                'rejected_vendors': rejected_vendors,
                'suspended_vendors': suspended_vendors,
                'blacklisted_vendors': blacklisted_vendors
            },
            'activity_statistics': {
                'total_bids': total_bids,
                'today_registrations': today_registrations,
                'today_tenders': today_tenders,
                'today_bids': today_bids,
                'pending_complaints': pending_complaints,
                'active_risk_alerts': active_risk_alerts
            },
            'recent_audit_logs': recent_logs
        })


# ──────────────────────────────────────────────
# 2. ORGANIZATION VERIFICATION & MANAGEMENT
# ──────────────────────────────────────────────

class AdminOrganizationView(APIView):
    def get(self, request):
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', '').strip()

        qs = Organization.objects.all()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search) | Q(tax_id__icontains=search))

        orgs_data = []
        for org in qs[:50]:
            user_count = org.users.count()
            tender_count = org.tenders.count()
            orgs_data.append({
                'id': str(org.id),
                'name': org.name,
                'code': org.code,
                'org_type': org.org_type,
                'tax_id': org.tax_id or 'N/A',
                'user_count': user_count,
                'tender_count': tender_count,
                'status': 'VERIFIED' if user_count > 0 else 'PENDING',
                'created_at': org.created_at.isoformat()
            })
        return Response({'organizations': orgs_data, 'total': len(orgs_data)})


class AdminOrganizationVerifyView(APIView):
    def post(self, request, pk):
        try:
            org = Organization.objects.get(pk=pk)
            data = get_request_data(request)
            action = data.get('action', 'VERIFY').upper()
            reason = data.get('reason', '')

            log_platform_audit(
                user=request.user,
                action=f"ORGANIZATION_{action}",
                entity_type="Organization",
                entity_id=org.id,
                description=f"Admin {action} organization {org.name}. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Organization {org.name} updated to {action}.", 'organization_id': str(org.id)})
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)


# ──────────────────────────────────────────────
# 3. VENDOR VERIFICATION, BLACKLISTING & SUSPENSION
# ──────────────────────────────────────────────

class AdminVendorManagementView(APIView):
    def get(self, request):
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', '').strip()

        qs = Vendor.objects.filter(is_deleted=False)
        if search:
            qs = qs.filter(Q(company_name__icontains=search) | Q(registration_number__icontains=search) | Q(email__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)

        vendors_data = []
        for v in qs[:100]:
            vendors_data.append({
                'id': str(v.id),
                'company_name': v.company_name,
                'registration_number': v.registration_number,
                'email': v.email,
                'phone': v.phone,
                'status': v.status,
                'status_display': v.get_status_display(),
                'overall_rating': float(v.overall_rating),
                'rating_count': v.rating_count,
                'completed_projects': v.completed_projects,
                'created_at': v.created_at.isoformat()
            })
        return Response({'vendors': vendors_data, 'total': len(vendors_data)})


class AdminVendorVerifyView(APIView):
    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
            data = get_request_data(request)
            action = data.get('action', 'VERIFY').upper()
            reason = data.get('reason', '')

            if action == 'REJECT' and not reason:
                return Response({'error': 'Reason is mandatory when rejecting vendor.'}, status=400)

            old_status = vendor.status
            new_status = VendorStatus.VERIFIED if action == 'VERIFY' else VendorStatus.REJECTED
            vendor.status = new_status
            vendor.verified_at = timezone.now() if action == 'VERIFY' else None
            vendor.save()

            VendorStatusHistory.objects.create(
                vendor=vendor,
                from_status=old_status,
                to_status=new_status,
                changed_by=request.user if hasattr(request.user, 'id') else None,
                reason=reason or f"Admin action: {action}"
            )

            log_platform_audit(
                user=request.user,
                action=f"VENDOR_{action}",
                entity_type="Vendor",
                entity_id=vendor.id,
                old_value={'status': old_status},
                new_value={'status': new_status},
                description=f"Vendor {vendor.company_name} {action}ed. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Vendor {vendor.company_name} status updated to {new_status}.", 'vendor_id': str(vendor.id)})
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)


class AdminVendorSuspendView(APIView):
    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
            data = get_request_data(request)
            reason = data.get('reason', '').strip()

            if not reason:
                return Response({'error': 'Reason is mandatory for suspending a vendor.'}, status=400)

            old_status = vendor.status
            vendor.status = VendorStatus.SUSPENDED
            vendor.save()

            VendorSuspension.objects.create(
                vendor=vendor,
                reason=reason,
                remarks=data.get('remarks', ''),
                created_by=request.user if hasattr(request.user, 'id') else None
            )

            VendorStatusHistory.objects.create(
                vendor=vendor,
                from_status=old_status,
                to_status=VendorStatus.SUSPENDED,
                changed_by=request.user if hasattr(request.user, 'id') else None,
                reason=reason
            )

            log_platform_audit(
                user=request.user,
                action="VENDOR_SUSPENDED",
                entity_type="Vendor",
                entity_id=vendor.id,
                description=f"Suspended vendor {vendor.company_name}. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Vendor {vendor.company_name} has been suspended.", 'vendor_id': str(vendor.id)})
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)


class AdminVendorBlacklistView(APIView):
    def post(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
            data = get_request_data(request)
            reason = data.get('reason', '').strip()
            evidence = data.get('evidence', '')

            if not reason:
                return Response({'error': 'Reason is required to blacklist a vendor.'}, status=400)

            old_status = vendor.status
            vendor.status = VendorStatus.BLACKLISTED
            vendor.save()

            VendorBlacklist.objects.create(
                vendor=vendor,
                reason=reason,
                description=data.get('description', ''),
                evidence_file=evidence,
                is_permanent=data.get('is_permanent', False),
                created_by=request.user if hasattr(request.user, 'id') else None,
                created_by_name=request.user.email if hasattr(request.user, 'email') else 'Admin'
            )

            VendorStatusHistory.objects.create(
                vendor=vendor,
                from_status=old_status,
                to_status=VendorStatus.BLACKLISTED,
                changed_by=request.user if hasattr(request.user, 'id') else None,
                reason=reason
            )

            log_platform_audit(
                user=request.user,
                action="VENDOR_BLACKLISTED",
                entity_type="Vendor",
                entity_id=vendor.id,
                description=f"Blacklisted vendor {vendor.company_name}. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Vendor {vendor.company_name} blacklisted successfully.", 'vendor_id': str(vendor.id)})
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)


class AdminBlacklistListView(APIView):
    def get(self, request):
        blacklists = VendorBlacklist.objects.all()[:100]
        data = []
        for b in blacklists:
            data.append({
                'id': str(b.id),
                'vendor_id': str(b.vendor.id),
                'vendor_name': b.vendor.company_name,
                'registration_number': b.vendor.registration_number,
                'reason': b.reason,
                'description': b.description,
                'evidence_file': b.evidence_file,
                'is_permanent': b.is_permanent,
                'status': b.status,
                'created_by': b.created_by_name or 'Admin',
                'created_at': b.created_at.isoformat()
            })
        return Response({'blacklists': data, 'total': len(data)})


# ──────────────────────────────────────────────
# 4. CATEGORY MANAGEMENT
# ──────────────────────────────────────────────

class AdminCategoryView(APIView):
    def get(self, request):
        categories = TenderCategory.objects.filter(parent_category__isnull=True)
        cat_data = []
        for c in categories:
            subs = list(c.subcategories.values('id', 'name', 'slug', 'is_active'))
            cat_data.append({
                'id': str(c.id),
                'name': c.name,
                'slug': c.slug,
                'description': c.description,
                'is_active': c.is_active,
                'subcategories': subs
            })
        return Response({'categories': cat_data})

    def post(self, request):
        data = get_request_data(request)
        name = data.get('name', '').strip()
        slug = data.get('slug', '').strip() or name.lower().replace(' ', '-')
        description = data.get('description', '')
        parent_id = data.get('parent_category_id')

        if not name:
            return Response({'error': 'Category name is required'}, status=400)

        parent = None
        if parent_id:
            try: parent = TenderCategory.objects.get(pk=parent_id)
            except TenderCategory.DoesNotExist: pass

        category = TenderCategory.objects.create(
            name=name,
            slug=slug,
            description=description,
            parent_category=parent
        )

        log_platform_audit(
            user=request.user,
            action="CATEGORY_CREATED",
            entity_type="Category",
            entity_id=category.id,
            description=f"Created category {name}",
            request=request
        )
        return Response({'message': f"Category '{name}' created successfully.", 'category_id': str(category.id)}, status=201)


# ──────────────────────────────────────────────
# 5. TENDER MONITORING & MODERATION
# ──────────────────────────────────────────────

class AdminTenderMonitoringView(APIView):
    def get(self, request):
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', '').strip()

        qs = Tender.objects.filter(is_deleted=False)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(tender_number__icontains=search) | Q(organization_name__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)

        tenders_data = []
        for t in qs[:100]:
            tenders_data.append({
                'id': str(t.id),
                'tender_number': t.tender_number,
                'title': t.title,
                'organization_name': t.effective_organization_name,
                'category_name': t.category.name if t.category else 'General',
                'budget': float(t.budget),
                'currency': t.currency,
                'status': t.status,
                'status_display': t.get_status_display(),
                'bids_count': t.bids.count(),
                'submission_deadline': t.submission_deadline.isoformat() if t.submission_deadline else None,
                'created_at': t.created_at.isoformat()
            })
        return Response({'tenders': tenders_data, 'total': len(tenders_data)})


class AdminTenderFlagView(APIView):
    def post(self, request, pk):
        try:
            tender = Tender.objects.get(pk=pk)
            data = get_request_data(request)
            action = data.get('action', 'FLAG').upper()
            reason = data.get('reason', '').strip()

            if action == 'CANCEL' and not reason:
                return Response({'error': 'Reason is mandatory when cancelling a tender.'}, status=400)

            if action == 'CANCEL':
                tender.status = TenderStatus.CANCELLED
                tender.save()

            log_platform_audit(
                user=request.user,
                action=f"TENDER_{action}",
                entity_type="Tender",
                entity_id=tender.id,
                description=f"Admin {action} tender {tender.tender_number}. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Tender {tender.tender_number} action '{action}' performed successfully."})
        except Tender.DoesNotExist:
            return Response({'error': 'Tender not found'}, status=404)


# ──────────────────────────────────────────────
# 6. COMPLAINTS & DISPUTE MANAGEMENT
# ──────────────────────────────────────────────

class AdminComplaintView(APIView):
    def get(self, request):
        status_filter = request.GET.get('status', '').strip()
        qs = Complaint.objects.all()
        if status_filter:
            qs = qs.filter(status=status_filter)

        complaints_data = []
        for c in qs[:100]:
            complaints_data.append({
                'id': str(c.id),
                'complaint_number': c.complaint_number,
                'raised_by': c.raised_by.email if c.raised_by else 'Unknown',
                'subject': c.subject,
                'category': c.category,
                'priority': c.priority,
                'status': c.status,
                'status_display': c.get_status_display(),
                'created_at': c.created_at.isoformat()
            })
        return Response({'complaints': complaints_data, 'total': len(complaints_data)})

    def post(self, request):
        data = get_request_data(request)
        subject = data.get('subject', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', 'GENERAL')

        if not subject or not description:
            return Response({'error': 'Subject and description are required.'}, status=400)

        c_number = f"CMP-{uuid.uuid4().hex[:8].upper()}"
        user = request.user if hasattr(request.user, 'id') else User.objects.first()

        complaint = Complaint.objects.create(
            complaint_number=c_number,
            raised_by=user,
            subject=subject,
            description=description,
            category=category,
            evidence_url=data.get('evidence_url', ''),
            priority=data.get('priority', ComplaintPriority.NORMAL)
        )

        return Response({'message': f"Complaint {c_number} logged successfully.", 'complaint_id': str(complaint.id)}, status=201)


class AdminComplaintResolveView(APIView):
    def post(self, request, pk):
        try:
            complaint = Complaint.objects.get(pk=pk)
            data = get_request_data(request)
            resolution_notes = data.get('resolution_notes', '').strip()

            if not resolution_notes:
                return Response({'error': 'Resolution notes are required.'}, status=400)

            complaint.status = ComplaintStatus.RESOLVED
            complaint.resolution_notes = resolution_notes
            complaint.resolved_at = timezone.now()
            if hasattr(request.user, 'id'):
                complaint.assigned_admin = request.user
            complaint.save()

            log_platform_audit(
                user=request.user,
                action="COMPLAINT_RESOLVED",
                entity_type="Complaint",
                entity_id=complaint.id,
                description=f"Resolved complaint {complaint.complaint_number}: {resolution_notes}",
                request=request
            )
            return Response({'message': f"Complaint {complaint.complaint_number} resolved."})
        except Complaint.DoesNotExist:
            return Response({'error': 'Complaint not found'}, status=404)


# ──────────────────────────────────────────────
# 7. RISK ALERTS & FRAUD MONITORING
# ──────────────────────────────────────────────

class AdminRiskAlertView(APIView):
    def get(self, request):
        qs = RiskAlert.objects.all()[:100]
        data = []
        for r in qs:
            data.append({
                'id': str(r.id),
                'alert_code': r.alert_code,
                'severity': r.severity,
                'entity_type': r.entity_type,
                'entity_id': r.entity_id,
                'reason': r.reason,
                'status': r.status,
                'detected_at': r.detected_at.isoformat()
            })
        return Response({'risk_alerts': data, 'total': len(data)})


# ──────────────────────────────────────────────
# 8. ANNOUNCEMENTS & NOTIFICATIONS
# ──────────────────────────────────────────────

class AdminAnnouncementView(APIView):
    def get(self, request):
        qs = PlatformAnnouncement.objects.filter(is_active=True)[:20]
        data = []
        for a in qs:
            data.append({
                'id': str(a.id),
                'title': a.title,
                'description': a.description,
                'priority': a.priority,
                'target_audience': a.target_audience,
                'created_at': a.created_at.isoformat()
            })
        return Response({'announcements': data})

    def post(self, request):
        data = get_request_data(request)
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        if not title or not description:
            return Response({'error': 'Title and description are required.'}, status=400)

        ann = PlatformAnnouncement.objects.create(
            title=title,
            description=description,
            priority=data.get('priority', ComplaintPriority.NORMAL),
            target_audience=data.get('target_audience', 'ALL'),
            created_by=request.user if hasattr(request.user, 'id') else None
        )

        return Response({'message': f"Announcement '{title}' published successfully.", 'announcement_id': str(ann.id)}, status=201)


# ──────────────────────────────────────────────
# 9. PLATFORM AUDIT LOGS & EXPORT
# ──────────────────────────────────────────────

class AdminAuditLogView(APIView):
    def get(self, request):
        qs = PlatformAuditLog.objects.all()[:200]
        logs = []
        for l in qs:
            logs.append({
                'id': str(l.id),
                'user_email': l.user_email or 'System',
                'user_role': l.user_role or 'ADMIN',
                'action': l.action,
                'entity_type': l.entity_type,
                'entity_id': l.entity_id,
                'description': l.description,
                'ip_address': l.ip_address,
                'timestamp': l.timestamp.isoformat()
            })
        return Response({'audit_logs': logs, 'total': len(logs)})


class AdminAuditLogExportView(APIView):
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="platform_audit_logs.csv"'

        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User Email', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address'])

        for l in PlatformAuditLog.objects.all()[:1000]:
            writer.writerow([
                l.timestamp.isoformat(),
                l.user_email or 'System',
                l.user_role or 'ADMIN',
                l.action,
                l.entity_type,
                l.entity_id or '',
                l.description or '',
                l.ip_address or ''
            ])
        return response


# ──────────────────────────────────────────────
# 10. SYSTEM SETTINGS
# ──────────────────────────────────────────────

class AdminSystemSettingsView(APIView):
    def get(self, request):
        settings_qs = SystemSetting.objects.all()
        if not settings_qs.exists():
            # Seed default settings
            defaults = [
                ('MIN_TENDER_DURATION_DAYS', '7', 'TENDER', 'Minimum allowed duration for tender publication'),
                ('MAX_FILE_UPLOAD_MB', '50', 'SYSTEM', 'Maximum file upload size in MB'),
                ('REQUIRED_VENDOR_DOCUMENTS', 'GST,Registration,TAX', 'VENDOR', 'Required mandatory vendor documents'),
                ('DEFAULT_EVALUATION_DEADLINE_DAYS', '14', 'EVALUATION', 'Default evaluation completion window')
            ]
            for key, val, cat, desc in defaults:
                SystemSetting.objects.create(key=key, value=val, category=cat, description=desc)

        data = list(SystemSetting.objects.all().values('id', 'key', 'value', 'category', 'description', 'updated_at'))
        return Response({'settings': data})

    def put(self, request):
        data = get_request_data(request)
        key = data.get('key')
        value = data.get('value')

        if not key or value is None:
            return Response({'error': 'Setting key and value are required.'}, status=400)

        setting, _ = SystemSetting.objects.get_or_create(key=key, defaults={'category': 'SYSTEM'})
        old_val = setting.value
        setting.value = str(value)
        if hasattr(request.user, 'id'):
            setting.updated_by = request.user
        setting.save()

        log_platform_audit(
            user=request.user,
            action="SYSTEM_SETTING_UPDATED",
            entity_type="SystemSetting",
            entity_id=setting.id,
            old_value={'value': old_val},
            new_value={'value': str(value)},
            description=f"Updated setting '{key}' to '{value}'",
            request=request
        )
        return Response({'message': f"Setting '{key}' updated successfully."})


# ──────────────────────────────────────────────
# 11. PLATFORM REPORTS
# ──────────────────────────────────────────────

class AdminReportsView(APIView):
    def get(self, request, report_type='platform'):
        if report_type == 'tenders':
            total = Tender.objects.count()
            by_status = list(Tender.objects.values('status').annotate(count=Count('id')))
            return Response({'report_type': 'tenders', 'total': total, 'by_status': by_status})
        elif report_type == 'vendors':
            total = Vendor.objects.count()
            by_status = list(Vendor.objects.values('status').annotate(count=Count('id')))
            return Response({'report_type': 'vendors', 'total': total, 'by_status': by_status})
        elif report_type == 'organizations':
            total = Organization.objects.count()
            return Response({'report_type': 'organizations', 'total': total})
        else:
            return Response({
                'report_type': 'platform_summary',
                'total_users': User.objects.count(),
                'total_vendors': Vendor.objects.count(),
                'total_tenders': Tender.objects.count(),
                'total_bids': Bid.objects.count()
            })


# ──────────────────────────────────────────────
# 12. USER DIRECTORY & ROLE GOVERNANCE
# ──────────────────────────────────────────────

class AdminUserManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        search = request.GET.get('search', '').strip()
        role_filter = request.GET.get('role', '').strip()
        status_filter = request.GET.get('status', '').strip()
        org_filter = request.GET.get('organization', '').strip()

        qs = User.objects.filter(is_deleted=False)
        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(organization_name__icontains=search)
            )
        if role_filter:
            qs = qs.filter(role=role_filter)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if org_filter:
            qs = qs.filter(Q(organization_id=org_filter) | Q(organization_name__icontains=org_filter))

        users_data = []
        for u in qs:
            users_data.append({
                'id': str(u.id),
                'email': u.email,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': u.full_name,
                'role': u.role,
                'role_display': u.get_role_display(),
                'status': u.status,
                'status_display': u.get_status_display(),
                'organization_name': u.effective_organization_name,
                'department_name': u.effective_department_name,
                'position_title': u.position_title or '',
                'phone_number': u.phone_number or '',
                'is_email_verified': u.is_email_verified,
                'is_mfa_enabled': u.is_mfa_enabled,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'created_at': u.created_at.isoformat()
            })

        return Response({
            'users': users_data,
            'count': len(users_data),
            'total': len(users_data),
            'metrics': {
                'total': User.objects.filter(is_deleted=False).count(),
                'active': User.objects.filter(is_deleted=False, status=UserStatus.ACTIVE).count(),
                'pending': User.objects.filter(is_deleted=False, status=UserStatus.PENDING_VERIFICATION).count(),
                'suspended': User.objects.filter(is_deleted=False, status=UserStatus.SUSPENDED).count(),
                'super_admins': User.objects.filter(is_deleted=False, role=UserRole.SUPER_ADMIN).count(),
                'org_admins': User.objects.filter(is_deleted=False, role=UserRole.ORG_ADMIN).count(),
                'vendors': User.objects.filter(is_deleted=False, role=UserRole.VENDOR).count(),
                'evaluators': User.objects.filter(is_deleted=False, role=UserRole.EVALUATOR).count(),
            }
        })


class AdminUserRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)
            data = get_request_data(request)
            new_role = data.get('role')

            if not new_role or new_role not in UserRole.values:
                return Response({'error': f'Valid role is required. Choices: {", ".join(UserRole.values)}'}, status=400)

            old_role = user.role
            user.role = new_role
            user.save()

            log_platform_audit(
                user=request.user,
                action="USER_ROLE_UPDATED",
                entity_type="User",
                entity_id=user.id,
                old_value={'role': old_role},
                new_value={'role': new_role},
                description=f"Updated role for {user.email} from {old_role} to {new_role}.",
                request=request
            )
            return Response({'message': f"Role for {user.email} updated to {user.get_role_display()}.", 'user_id': str(user.id)})
        except User.DoesNotExist:
            return Response({'error': 'User account not found.'}, status=404)


class AdminUserStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return Response({"error": "Unauthorized: Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if getattr(request.user, 'role', None) not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            return Response({"error": "Forbidden: Requires Super Admin or Org Admin role."}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)
            data = get_request_data(request)
            action = data.get('action', 'ACTIVATE').upper()
            reason = data.get('reason', '')

            old_status = user.status
            if action == 'SUSPEND':
                user.status = UserStatus.SUSPENDED
                UserSession.objects.filter(user=user).update(is_active=False)
            elif action == 'VERIFY':
                user.is_email_verified = True
                user.status = UserStatus.ACTIVE
            else:
                user.status = UserStatus.ACTIVE

            user.save()

            log_platform_audit(
                user=request.user,
                action=f"USER_STATUS_{action}",
                entity_type="User",
                entity_id=user.id,
                old_value={'status': old_status},
                new_value={'status': user.status},
                description=f"Admin {action} user {user.email}. Reason: {reason}",
                request=request
            )
            return Response({'message': f"Status for {user.email} updated to {user.get_status_display()}.", 'user_id': str(user.id)})
        except User.DoesNotExist:
            return Response({'error': 'User account not found.'}, status=404)

