# Document Templates & Dynamic Generation

## 1. Overview
Procurement authorities can configure standard templates (e.g. Tender Notices, Award Letters, Non-Disclosure Agreements, Bank Guarantee Verification forms).

## 2. Safe Variable Interpolation
Templates support Mustache placeholders without executing arbitrary code:
- `{{tender.title}}`
- `{{tender.reference}}`
- `{{vendor.name}}`
- `{{vendor.gst_number}}`
- `{{organization.name}}`
- `{{contract.amount}}`

## 3. Automated Document Generation Flow
1. Select template.
2. Supply entity context JSON.
3. System replaces variables using safe regex parsing.
4. Generates `.txt` / `.pdf` object and stores in S3.
5. Automatically creates `Document` and `DocumentVersion` 1 with SHA-256 hash.
6. Logs `DOCUMENT_GENERATED` in the audit log.
