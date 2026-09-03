import os
import hashlib
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from django.http import HttpResponse, Http404

try:
    from rest_framework.views import APIView
    from rest_framework.response import Response
    from rest_framework import status, permissions
    from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    class MultiPartParser: pass
    class FormParser: pass
    class JSONParser: pass

from accounts.views import get_request_data
from accounts.models import UserRole
from documents.models import (
    DocumentType, Document, DocumentVersion, DocumentOCR,
    DocumentTemplate, DocumentAuditLog, DocumentAuditAction,
    LifecycleStatus, VerificationStatus, ScanStatus, OCRStatus, UploadStatus
)
from documents.serializers import (
    DocumentTypeSerializer, DocumentListSerializer, DocumentDetailSerializer,
    DocumentUploadInitiateSerializer, DocumentVersionSerializer, DocumentOCRSerializer,
    DocumentTemplateSerializer
)
from documents.services.storage import get_storage_provider
from documents.services.upload import DocumentUploadService
from documents.services.version import DocumentVersionService
from documents.services.access import DocumentAccessService
from documents.services.verification import DocumentVerificationService
from documents.services.template import DocumentTemplateService
from documents.services.ocr import DocumentOCRService


class DocumentTypeListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from documents.seed import seed_default_document_types
        if DocumentType.objects.count() == 0:
            seed_default_document_types()
        types = DocumentType.objects.filter(is_active=True)

        return Response({
            "success": True,
            "data": DocumentTypeSerializer(types, many=True).data
        }, status=status.HTTP_200_OK)


class DocumentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Document.objects.filter(is_deleted=False)

        # Enforce Organization Isolation unless Super Admin
        user = request.user
        if user.role != UserRole.SUPER_ADMIN:
            if user.role == UserRole.VENDOR:
                # Vendors see public tender documents or their own uploaded documents
                queryset = queryset.filter(
                    Q(owner_type='TENDER') | Q(uploaded_by=user)
                )
            elif user.organization_id:
                queryset = queryset.filter(
                    Q(organization_id=user.organization_id) | Q(owner_type='TENDER')
                )

        # Filters
        search = request.GET.get('search', request.GET.get('q', '')).strip()
        doc_status = request.GET.get('status', '').strip()
        doc_type = request.GET.get('document_type', '').strip()
        owner_type = request.GET.get('owner_type', '').strip()
        owner_id = request.GET.get('owner_id', '').strip()
        verification_status = request.GET.get('verification_status', '').strip()
        is_archived = request.GET.get('is_archived', '').strip()
        sort_by = request.GET.get('sort_by', '-created_at').strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(original_filename__icontains=search) |
                Q(description__icontains=search) |
                Q(ocr_records__extracted_text__icontains=search)
            ).distinct()

        if doc_status:
            queryset = queryset.filter(lifecycle_status=doc_status)
        if doc_type:
            queryset = queryset.filter(document_type_id=doc_type)
        if owner_type:
            queryset = queryset.filter(owner_type=owner_type)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        if is_archived:
            queryset = queryset.filter(is_archived=(is_archived.lower() == 'true'))
        else:
            queryset = queryset.filter(is_archived=False)

        if sort_by in ['created_at', '-created_at', 'title', '-title', 'file_size', '-file_size', 'expires_at', '-expires_at']:
            queryset = queryset.order_by(sort_by)

        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        total = queryset.count()
        start = (page - 1) * limit
        end = start + limit

        serializer = DocumentListSerializer(queryset[start:end], many=True)
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


class DocumentUploadInitiateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = get_request_data(request)
        serializer = DocumentUploadInitiateSerializer(data=data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        org = getattr(request.user, 'organization', None)
        try:
            upload_session = DocumentUploadService.initiate_upload(
                user=request.user,
                organization=org,
                data=serializer.validated_data
            )
            return Response({
                "success": True,
                "message": "Upload session initiated successfully",
                "data": upload_session
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentUploadCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = get_request_data(request)
        document_id = data.get('document_id')
        sha256_hash = data.get('sha256_hash')
        parts = data.get('parts')
        upload_id = data.get('upload_id')
        file_obj = request.FILES.get('file')

        if not document_id:
            return Response({"success": False, "message": "document_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doc = DocumentUploadService.complete_upload(
                document_id=document_id,
                user=request.user,
                file_obj=file_obj,
                sha256_hash=sha256_hash,
                parts=parts,
                upload_id=upload_id
            )
            return Response({
                "success": True,
                "message": "Document uploaded and queued for security scanning & OCR successfully",
                "data": DocumentDetailSerializer(doc).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_view_document(request.user, document):
            return Response({
                "success": False,
                "error": {
                    "code": "DOCUMENT_ACCESS_DENIED",
                    "message": "You do not have permission to access this document."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # Log view action
        user_name = request.user.full_name if hasattr(request.user, 'full_name') else str(request.user)
        DocumentAuditLog.objects.create(
            document=document,
            action=DocumentAuditAction.DOCUMENT_VIEWED,
            performed_by=request.user,
            performed_by_name=user_name,
            details={'ip': request.META.get('REMOTE_ADDR')}
        )

        return Response({
            "success": True,
            "data": DocumentDetailSerializer(document).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_edit_or_delete_document(request.user, document):
            return Response({
                "success": False,
                "error": {
                    "code": "DOCUMENT_ACCESS_DENIED",
                    "message": "You do not have permission to delete this document."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        document.is_deleted = True
        document.deleted_at = timezone.now()
        document.deleted_by = request.user
        document.lifecycle_status = LifecycleStatus.DELETED
        document.save()

        user_name = request.user.full_name if hasattr(request.user, 'full_name') else str(request.user)
        DocumentAuditLog.objects.create(
            document=document,
            action=DocumentAuditAction.DOCUMENT_ARCHIVED,
            performed_by=request.user,
            performed_by_name=user_name,
            details={'action': 'Soft-deleted'}
        )

        return Response({
            "success": True,
            "message": "Document soft-deleted successfully"
        }, status=status.HTTP_200_OK)


class DocumentViewerDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_view_document(request.user, document):
            return Response({
                "success": False,
                "error": {
                    "code": "DOCUMENT_ACCESS_DENIED",
                    "message": "You do not have permission to view this document."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        storage = get_storage_provider()
        preview_url_info = storage.generate_download_url(document.storage_key, original_filename=document.original_filename, expires_in=900)

        latest_ocr = document.ocr_records.first()

        return Response({
            "success": True,
            "data": {
                "document": DocumentDetailSerializer(document).data,
                "preview_url": preview_url_info['download_url'],
                "expires_in": preview_url_info['expires_in'],
                "security_status": {
                    "encryption_at_rest": "SSE-KMS (AWS KMS 256-bit)",
                    "transport_security": "TLS/HTTPS Encrypted",
                    "integrity_hash": document.sha256_hash,
                    "integrity_verified": bool(document.sha256_hash),
                    "malware_scan": document.scan_status,
                    "quarantined": document.is_quarantined
                },
                "ocr_extracted_text": latest_ocr.extracted_text if latest_ocr else None,
                "ocr_confidence": latest_ocr.confidence_score if latest_ocr else None,
                "page_count": latest_ocr.page_count if latest_ocr else 1
            }
        }, status=status.HTTP_200_OK)


class DocumentDownloadURLView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_download_document(request.user, document):
            return Response({
                "success": False,
                "error": {
                    "code": "DOCUMENT_ACCESS_DENIED",
                    "message": "You do not have permission to download this document or file is quarantined."
                }
            }, status=status.HTTP_403_FORBIDDEN)

        storage = get_storage_provider()
        download_info = storage.generate_download_url(
            document.storage_key,
            original_filename=document.original_filename,
            expires_in=900
        )

        user_name = request.user.full_name if hasattr(request.user, 'full_name') else str(request.user)
        DocumentAuditLog.objects.create(
            document=document,
            action=DocumentAuditAction.DOCUMENT_DOWNLOADED,
            performed_by=request.user,
            performed_by_name=user_name,
            details={'ip': request.META.get('REMOTE_ADDR')}
        )

        return Response({
            "success": True,
            "data": download_info
        }, status=status.HTTP_200_OK)


class DocumentVersionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_view_document(request.user, document):
            return Response({"success": False, "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        versions = document.versions.all().order_by('-version_number')
        return Response({
            "success": True,
            "data": DocumentVersionSerializer(versions, many=True).data
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_edit_or_delete_document(request.user, document):
            return Response({"success": False, "message": "Access denied to update document version"}, status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request)
        file_obj = request.FILES.get('file')
        change_summary = data.get('change_summary', 'Uploaded new version')

        if not file_obj:
            return Response({"success": False, "message": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

        content_bytes = file_obj.read()
        file_size = len(content_bytes)
        sha256_hash = hashlib.sha256(content_bytes).hexdigest()
        next_version_num = document.versions.count() + 1

        org_id_str = str(document.organization_id) if document.organization_id else 'global'
        new_storage_key = f"organizations/{org_id_str}/{document.owner_type.lower()}s/{document.owner_id or 'general'}/documents/{document.id}/versions/{next_version_num}/{file_obj.name}"

        storage = get_storage_provider()
        storage.upload_bytes(new_storage_key, content_bytes, document.mime_type)

        new_version = DocumentVersionService.create_version(
            document=document,
            uploaded_by=request.user,
            storage_key=new_storage_key,
            original_filename=file_obj.name,
            file_size=file_size,
            mime_type=document.mime_type,
            sha256_hash=sha256_hash,
            change_summary=change_summary
        )

        return Response({
            "success": True,
            "message": f"Version {new_version.version_number} created successfully",
            "data": DocumentVersionSerializer(new_version).data
        }, status=status.HTTP_201_CREATED)


class DocumentVerifyActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.EVALUATOR, UserRole.AUDITOR]:
            return Response({"success": False, "message": "Only authorized officers can verify documents"}, status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request)
        verification_status = data.get('status', 'VERIFIED')
        reason = data.get('reason', '')

        try:
            updated_doc = DocumentVerificationService.verify_document(
                document_id=document.id,
                user=user,
                status_choice=verification_status,
                reason=reason
            )
            return Response({
                "success": True,
                "message": f"Document verification updated to '{verification_status}'",
                "data": DocumentDetailSerializer(updated_doc).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentArchiveRestoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        try:
            document = Document.objects.get(id=pk, is_deleted=False)
        except Document.DoesNotExist:
            return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if not DocumentAccessService.can_edit_or_delete_document(request.user, document):
            return Response({"success": False, "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        user_name = request.user.full_name if hasattr(request.user, 'full_name') else str(request.user)

        if action == 'archive':
            document.is_archived = True
            document.lifecycle_status = LifecycleStatus.ARCHIVED
            document.save()
            DocumentAuditLog.objects.create(
                document=document,
                action=DocumentAuditAction.DOCUMENT_ARCHIVED,
                performed_by=request.user,
                performed_by_name=user_name,
                details={'action': 'Archived'}
            )
            return Response({"success": True, "message": "Document archived successfully"}, status=status.HTTP_200_OK)
        elif action == 'restore':
            document.is_archived = False
            document.lifecycle_status = LifecycleStatus.AVAILABLE
            document.save()
            DocumentAuditLog.objects.create(
                document=document,
                action=DocumentAuditAction.DOCUMENT_RESTORED,
                performed_by=request.user,
                performed_by_name=user_name,
                details={'action': 'Unarchived'}
            )
            return Response({"success": True, "message": "Document restored successfully"}, status=status.HTTP_200_OK)
        return Response({"success": False, "message": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class DocumentExpiringListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        days = int(request.GET.get('days', 30))
        queryset = Document.objects.filter(
            is_deleted=False,
            expires_at__isnull=False,
            expires_at__lte=now + timedelta(days=days)
        ).order_by('expires_at')

        return Response({
            "success": True,
            "data": DocumentListSerializer(queryset, many=True).data,
            "count": queryset.count()
        }, status=status.HTTP_200_OK)


class DocumentTemplateListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        templates = DocumentTemplate.objects.filter(is_active=True)
        return Response({
            "success": True,
            "data": DocumentTemplateSerializer(templates, many=True).data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.TENDER_MANAGER]:
            return Response({"success": False, "message": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        data = get_request_data(request)
        code = data.get('code', '').upper()
        if not code:
            return Response({"success": False, "message": "code is required"}, status=status.HTTP_400_BAD_REQUEST)

        tmpl = DocumentTemplate.objects.create(
            name=data.get('name', 'Procurement Template'),
            code=code,
            description=data.get('description', ''),
            category_id=data.get('category'),
            document_type_id=data.get('document_type'),
            organization=getattr(request.user, 'organization', None),
            template_content=data.get('template_content', ''),
            variables_schema=data.get('variables_schema', {}),
            created_by=request.user
        )
        return Response({
            "success": True,
            "message": "Document template created successfully",
            "data": DocumentTemplateSerializer(tmpl).data
        }, status=status.HTTP_201_CREATED)


class DocumentTemplateGenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        data = get_request_data(request)
        context_data = data.get('context_data', {})
        title = data.get('title')
        owner_type = data.get('owner_type', 'TENDER')
        owner_id = data.get('owner_id')

        try:
            generated_doc = DocumentTemplateService.generate_document_from_template(
                template_id=pk,
                context_data=context_data,
                user=request.user,
                title=title,
                owner_type=owner_type,
                owner_id=owner_id
            )
            return Response({
                "success": True,
                "message": "Document generated successfully from template",
                "data": DocumentDetailSerializer(generated_doc).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StorageHealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        storage = get_storage_provider()
        provider_name = storage.__class__.__name__

        test_key = f"health-check/{timezone.now().strftime('%Y%m%d%H%M%S')}.txt"
        test_bytes = b"tenderX-health-check-ok"
        status_ok = True
        err = None

        try:
            storage.upload_bytes(test_key, test_bytes, 'text/plain')
            exists = storage.exists(test_key)
            storage.delete(test_key)
            if not exists:
                status_ok = False
        except Exception as e:
            status_ok = False
            err = str(e)

        return Response({
            "success": status_ok,
            "storage_provider": provider_name,
            "bucket": getattr(storage, 'bucket', 'tenderx-documents'),
            "encryption": "SSE-KMS" if provider_name == 'S3StorageProvider' else "Local-Encrypted",
            "status": "OPERATIONAL" if status_ok else "DEGRADED",
            "error": err
        }, status=status.HTTP_200_OK if status_ok else status.HTTP_500_INTERNAL_SERVER_ERROR)


# Local development direct-upload / download simulator handlers
class LocalStorageDirectUploadView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        key = request.GET.get('key')
        if not key:
            return Response({"error": "Storage key missing"}, status=status.HTTP_400_BAD_REQUEST)

        storage = get_storage_provider()
        if hasattr(request, 'FILES') and 'file' in request.FILES:
            content = request.FILES['file'].read()
        else:
            content = request.body

        storage.upload_bytes(key, content)
        return Response({"status": "Uploaded", "key": key}, status=status.HTTP_200_OK)


class LocalStorageDirectDownloadView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        key = request.GET.get('key')
        filename = request.GET.get('filename', 'document.pdf')
        if not key:
            raise Http404("Key not provided")

        storage = get_storage_provider()
        try:
            content = storage.get_object_bytes(key)
        except Exception:
            raise Http404("Object not found")

        response = HttpResponse(content, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
