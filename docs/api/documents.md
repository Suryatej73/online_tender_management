# Document Management REST API Reference

All endpoints are prefixed with `/api/v1/documents/`.

---

## 1. Document Types
### `GET /api/v1/documents/types/`
Returns all active configurable document types.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "c1f7b0f0-8c27-449e-b830-4e3a537f2a1b",
      "name": "Tender Specification",
      "code": "TENDER_SPEC",
      "description": "Technical specifications and statement of work",
      "allowed_extensions": [".pdf", ".docx"],
      "max_file_size": 26214400,
      "requires_ocr": true,
      "requires_verification": false,
      "expiry_required": false,
      "versioning_enabled": true
    }
  ]
}
```

---

## 2. Document Upload Workflows

### `POST /api/v1/documents/upload/initiate/`
Initiates a single or multipart upload session. Validates file extension, size limits, and user permissions, returning presigned upload metadata.

**Request**:
```json
{
  "title": "Medical Facility Civil Works RFP",
  "original_filename": "facility_rfp.pdf",
  "file_size": 4200000,
  "mime_type": "application/pdf",
  "owner_type": "TENDER",
  "owner_id": "96b6fba3-34e8-46cb-849c-d655f462f43d",
  "document_type": "c1f7b0f0-8c27-449e-b830-4e3a537f2a1b",
  "is_multipart": false
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Upload session initiated successfully",
  "data": {
    "document_id": "23d38e21-0a37-4d7a-8f78-3a9ec6c8e312",
    "storage_key": "organizations/moh/tenders/96b6fba3/documents/23d38e21/versions/1/facility_rfp.pdf",
    "is_multipart": false,
    "upload_url": "https://tenderx-documents.s3.amazonaws.com/...",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf",
      "x-amz-server-side-encryption": "aws:kms"
    }
  }
}
```

### `POST /api/v1/documents/upload/complete/`
Finalizes upload, verifies SHA-256 hash, creates initial immutable Version 1, and dispatches asynchronous malware scan and OCR pipelines.

**Request**:
```json
{
  "document_id": "23d38e21-0a37-4d7a-8f78-3a9ec6c8e312",
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 3. Document Retrieval & Viewing

### `GET /api/v1/documents/`
Filtered and paginated document query.
- Query parameters: `search`, `document_type`, `status`, `owner_type`, `owner_id`, `verification_status`, `sort_by`, `page`, `limit`.

### `GET /api/v1/documents/{id}/viewer/`
Generates a short-lived authorized preview session (default 900s) with cryptographic integrity status, malware scan verification, and extracted OCR text.

---

## 4. Verification Workflow

### `POST /api/v1/documents/{id}/verify/`
Authorized procurement officers mark compliance status.

**Request**:
```json
{
  "status": "VERIFIED",
  "reason": "Verified against state registrar database."
}
```
