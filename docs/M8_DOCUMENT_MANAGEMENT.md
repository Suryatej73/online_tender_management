# Module 8 — Secure Document Management, Storage & Document Intelligence

## 📌 1. Executive Summary

Module 8 transforms **tenderX** into an enterprise-grade document platform that complies with international and government procurement standards (e.g., GeM, CPPP, World Bank e-Procurement). It provides secure cloud storage, direct and multipart S3 uploads, immutable version control, an asynchronous OCR text extraction pipeline, a malware quarantine architecture, a verification workflow, dynamic document template generation, and multi-tenant organization isolation.

---

## 🏛️ 2. Architectural Overview

```
                      +------------------------------------------+
                      |         REACT FRONTEND (Vite)            |
                      |  - DocumentManagementDashboard.jsx       |
                      |  - documentsApi.js (Service Layer)       |
                      |  - S3 Direct & Bulk Multipart Uploaders  |
                      |  - Document Viewer (Preview + OCR Panel) |
                      +------------------------------------------+
                                           │
                                           ▼ (HTTPS REST / Presigned URLs)
                      +------------------------------------------+
                      |        DJANGO REST FRAMEWORK BACKEND     |
                      |  - DocumentAccessService (RBAC & Tenant) |
                      |  - DocumentUploadService                 |
                      |  - DocumentVersionService (Sequential)   |
                      |  - DocumentScanService (Quarantine)      |
                      |  - DocumentOCRService (Confidence >= 70%)|
                      |  - DocumentTemplateService (Safe Regex)  |
                      +------------------------------------------+
                                    │               │
                      ┌─────────────┴───┐       ┌───┴──────────────┐
                      ▼                 ▼       ▼                  ▼
              PostgreSQL Database    Redis / Celery      AWS S3 (SSE-KMS)
              - Documents            - OCR Workers       - Private Bucket
              - Document Versions    - Scan Tasks        - Presigned GET/PUT
              - Document OCR Records - Expiry Scheduler  - Multipart Parts
              - Audit Logs           - Bulk Tasks        - Customer KMS Key
```

---

## 🗄️ 3. Database Models & Schema

### `DocumentType`
Configurable rules for procurement documents:
- `code`: Unique identifier (e.g. `TENDER_SPEC`, `BOQ`, `GST_CERT`, `TECH_PROPOSAL`, `FIN_PROPOSAL`, `BANK_GUARANTEE`, `CONTRACT`).
- `allowed_extensions`: Permitted MIME extensions (e.g. `['.pdf', '.docx']`).
- `max_file_size`: Maximum allowed payload size in bytes.
- `requires_ocr`, `requires_verification`, `expiry_required`, `versioning_enabled`.

### `Document`
Central entity for all tender, vendor, bid, and contract files:
- `id`: UUID Primary Key.
- `organization`: Foreign Key to `accounts.Organization` (for multi-tenant isolation).
- `uploaded_by`: Foreign Key to `accounts.User`.
- `owner_type`: Enum (`TENDER`, `VENDOR`, `BID`, `EVALUATION`, `AWARD`, `CONTRACT`, `ORGANIZATION`).
- `owner_id`: Target entity ID.
- `storage_key`: S3 object key structured as:
  `organizations/{org_id}/{owner_type}s/{owner_id}/documents/{document_id}/versions/{version}/{filename}`
- `sha256_hash`: Cryptographic content checksum for tamper detection and integrity verification.
- `lifecycle_status`: 13-stage state machine:
  `INITIATED` ➔ `UPLOADING` ➔ `UPLOADED` ➔ `SCANNING` ➔ `OCR_PROCESSING` ➔ `VERIFICATION` ➔ `AVAILABLE`  
  *(Terminal / Failure States: `REJECTED`, `QUARANTINED`, `FAILED`, `EXPIRED`, `ARCHIVED`, `DELETED`)*
- `current_version`: Integer pointer to the active version.
- `expires_at`: Expiration timestamp for bank guarantees, contractor licenses, and certifications.

### `DocumentVersion`
Immutable historical version archive:
- `document`: Foreign Key to parent `Document`.
- `version_number`: Strictly sequential integer (`1`, `2`, `3`...).
- `is_current`: Atomic boolean flag (only one version is `is_current=True` at any time).
- `storage_key`, `sha256_hash`, `file_size`, `change_summary`.

### `DocumentOCR`
Extracted text and intelligence data:
- `extracted_text`: Raw extracted text from PDF/Images.
- `confidence_score`: Float between 0.0 and 100.0%.
- `processing_status`: `COMPLETED`, `REVIEW_REQUIRED` (if confidence < 70%), `FAILED`, `SKIPPED`.

### `DocumentTemplate`
Reusable procurement templates with safe token rendering:
- `template_content`: Text with Mustache placeholders like `{{tender.title}}`, `{{vendor.name}}`, `{{contract.amount}}`.
- Evaluated via strict regex replacement without code execution vulnerabilities.

---

## 🔒 4. Security & Cryptographic Protection

1. **Private S3 Buckets**: Public read/write is completely blocked.
2. **Encryption at Rest**: AWS KMS (`SSE-KMS`) customer-managed or AWS keys.
3. **Encryption in Transit**: TLS / HTTPS mandatory.
4. **Presigned URLs**: Direct-to-S3 uploads and downloads use time-limited presigned URLs (default 900s expiration). AWS credentials are never exposed to browser clients.
5. **Malware Quarantine**: Suspicious files (e.g. EICAR or disguised executables) are quarantined immediately (`scan_status=INFECTED`, `lifecycle_status=QUARANTINED`). Downloads and OCR processing are permanently locked.
6. **Multi-Tenant Isolation**:
   - Super Admin: Full system-wide visibility.
   - Org Admin / Tender Manager: Strictly restricted to their own organization.
   - Vendors: Can only view their own uploaded compliance files; prohibited from accessing rival vendors' documents.
   - Evaluators: Financial bid proposals remain locked until official opening stage.

---

## 🔌 5. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/documents/types/` | List configurable document types |
| `GET` | `/api/v1/documents/` | Filtered, searchable, paginated document list |
| `POST` | `/api/v1/documents/upload/initiate/` | Request presigned upload URL / multipart session |
| `POST` | `/api/v1/documents/upload/complete/` | Finalize upload, verify SHA-256, dispatch scan & OCR |
| `GET` | `/api/v1/documents/<id>/` | Detailed document metadata & status |
| `GET` | `/api/v1/documents/<id>/viewer/` | Secure temporary preview session with OCR & security panel |
| `GET` | `/api/v1/documents/<id>/download/` | Authorized presigned download URL |
| `GET` | `/api/v1/documents/<id>/versions/` | List immutable historical versions |
| `POST` | `/api/v1/documents/<id>/versions/` | Upload a new sequential version |
| `POST` | `/api/v1/documents/<id>/verify/` | Mark document `VERIFIED`, `REJECTED`, or `REVIEW_REQUIRED` |
| `POST` | `/api/v1/documents/<id>/archive/` | Soft-archive document |
| `POST` | `/api/v1/documents/<id>/restore/` | Restore archived document |
| `GET` | `/api/v1/documents/expiring/?days=30`| Expiring document alerts |
| `GET` | `/api/v1/documents/templates/` | List active procurement templates |
| `POST` | `/api/v1/documents/templates/<id>/generate/` | Render document from template with entity data |
| `GET` | `/api/v1/health/storage/` | S3 / Local storage health check |

---

## 🧪 6. Testing & Quality Assurance

A dedicated suite of 9 comprehensive test cases in `backend/documents/tests.py` verifies:
- Storage provider abstraction (`S3StorageProvider` and `LocalStorageProvider`).
- Presigned upload initiation, direct upload, and SHA-256 hash calculation.
- Version sequentiality, atomic current flags, and version restoration.
- Antivirus malware detection and quarantine locking.
- Asynchronous OCR extraction and confidence evaluation.
- Document compliance verification workflows.
- Safe template rendering and automated document generation.
- Multi-tenant organization isolation and role security checks.
- Expiration tracking.

**Test Run Output:**
```bash
USE_SQLITE=True python3 manage.py test documents.tests tenders.tests accounts.tests core.tests
Ran 25 tests in 22.095s OK (100% Pass)
```

**Frontend Build Output:**
```bash
npm run build
✓ 1891 modules transformed.
✓ built in 1.35s (0 errors)
```
