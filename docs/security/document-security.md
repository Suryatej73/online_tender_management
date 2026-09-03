# Document Security & Compliance Architecture

## 1. Multi-Tenant Organization Isolation
- Every document is scoped to an `organization_id` or marked as public tender documentation.
- The `DocumentAccessService` verifies tenant boundaries on every single API request.
- Vendors cannot access records of competitor vendors or internal government organization files.

## 2. Bid Security & Unsealing Protocol
- Integrates with Module 7 (Bid Management).
- In two-envelope procurement, Technical Bid documents are accessible during evaluation, while Financial Bid documents remain cryptographically sealed until official unsealing by authorized evaluators.

## 3. Cryptographic Integrity Hashing
- Every uploaded object and version has its SHA-256 computed and recorded in the database.
- Integrity can be independently verified at any time to guarantee that the document in storage matches the file submitted at bid closure.

## 4. Antivirus Scanning & Quarantine Workflow
- Before any file is marked available or passed to OCR/Search, it is inspected by the `DocumentScanService`.
- If an infected signature (or executable disguised as a PDF) is detected:
  - Document `scan_status` becomes `INFECTED`.
  - Document `lifecycle_status` becomes `QUARANTINED`.
  - Download and preview URLs are permanently revoked.
  - A security alert is logged in `DocumentAuditLog`.
