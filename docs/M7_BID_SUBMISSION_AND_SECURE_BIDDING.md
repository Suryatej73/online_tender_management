# Module 7 (M7): Bid Submission & Secure Bid Management Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M7 - Bid Creation, Submission, Technical/Financial Proposals, Document Upload, Amendment, Withdrawal, Versioning, Sealed Bidding, Bid Opening, Integrity Verification, Audit Trail  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 1. Module Overview & Features

Module 7 transforms the tenderX platform from a tender-only system into a **complete two-envelope sealed bidding platform**. Vendors can prepare, submit, amend, and withdraw bids through a secure workflow, while administrators control the authorized opening of technical and financial proposals separately.

Key Capabilities Implemented:

1. **Bid Creation**: Vendor creates a bid against an active tender. Validates tender status, deadline, vendor eligibility, and prevents duplicate active bids. Returns a unique bid reference (e.g., `OTMS-BID-2026-00042`).
2. **Technical Bid**: Non-financial proposal content — methodology, implementation plan, delivery schedule, team information, compliance statement. Stored separately from financial data.
3. **Financial Bid**: Highly confidential financial proposal with encryption-at-rest placeholder. Strict server-side access control: sealed until authorized opening. Never exposed through generic serializers, logs, analytics, or browser metadata.
4. **Bid Document Upload**: Secure document upload with type validation (PDF, DOCX, XLSX, PNG, JPG), SHA-256 hashing, and verification workflow (UPLOADED → SCANNING → VERIFIED → REJECTED).
5. **Bid Tracking Timeline**: 10-stage visual timeline showing bid progress from creation to award decision.
6. **Bid Amendment**: Versioned amendments with deadline enforcement. Previous versions remain immutable. Each amendment creates a new version with integrity hash.
7. **Bid Withdrawal**: Destructive confirmation workflow. Bids are never physically deleted — WITHDRAWN state preserved for audit.
8. **Bid Versioning**: Immutable version snapshots at every meaningful change. Includes technical snapshot, financial reference, document references, and integrity hash.
9. **Bid Locking**: Automatic server-side locking when submission deadline expires. Uses `SELECT FOR UPDATE` to prevent race conditions. Frontend countdown is cosmetic only.
10. **Sealed Bid Mechanism**: Financial data encrypted at rest. Access controlled by opening stage and user role. Sealed view returns only `{status: "SEALED"}`.
11. **Bid Opening Workflow**: 6-stage controlled opening: Not Started → Technical Authorized → Technical Opened → Financial Authorized → Financial Opened → Completed. Each stage requires explicit authorization.
12. **Bid Opening Authorization**: Only authorized roles can open bids. Financial opening restricted to Super Admin and Org Admin.
13. **Bid Integrity Verification**: SHA-256 digest computed at submission from bid data + document hashes + version. Recomputed at opening and compared. Mismatch triggers INTEGRITY_FAILURE with critical audit event.
14. **Audit Trail**: Every security-sensitive operation logged with actor, action, outcome, IP address, correlation ID. Metadata sanitized to never expose passwords, keys, or financial data.
15. **Notifications**: Background task-driven notifications for bid events (created, submitted, locked, opened, withdrawn).
16. **Role-Based Access**: Object-level permissions enforce vendor isolation (Vendor A cannot access Vendor B's bid). Role-based permissions for opening, evaluation, and admin actions.
17. **Deadline Enforcement**: Server-authoritative deadline validation. Celery periodic task automatically locks expired bids. Approaching-deadline alerts sent to affected vendors.
18. **Transaction-Safe State Transitions**: All critical workflows use Django atomic transactions and `SELECT FOR UPDATE` row-level locking.
19. **Bid Submission Wizard**: 8-step guided submission: Eligibility → Bidder Info → Technical → Documents → Financial → Declarations → Review → Submit.
20. **Admin Opening Dashboard**: Control center for managing the bid opening workflow with stage indicators, integrity status, and action logging.

---

## 2. Architecture & Data Model

```
┌─────────────────────────┐
│        Tender           │
│  (existing M5 model)    │
│  submission_deadline    │
│  status (ACTIVE/PUBL)   │
└────────────┬────────────┘
             │ 1
             v N
┌─────────────────────────┐     ┌──────────────────────────────┐
│         Bid             │────<│       BidDocument            │
│                         │ 1 N │                              │
│  bid_reference (unique) │     │  document_type (10 types)   │
│  status (16 states)     │     │  original_filename           │
│  current_version        │     │  sha256_hash                 │
│  submitted_at           │     │  verification_status         │
│  locked_at              │     │  uploaded_by (FK)            │
└────┬────┬────┬──────────┘     └──────────────────────────────┘
     │    │    │
     │    │    │ 1          ┌──────────────────────────────┐
     │    │    └───────────<│       BidVersion             │
     │    │      1 N       │  version_number               │
     │    │                 │  technical_snapshot (JSON)    │
     │    │                 │  financial_snapshot (ref)     │
     │    │                 │  integrity_hash               │
     │    │                 └──────────────────────────────┘
     │    │
     │    │ 1              ┌──────────────────────────────┐
     │    └───────────────<│     TechnicalBid             │
     │      1:1            │  methodology, description     │
     │                     │  implementation_plan          │
     │                     │  team_information             │
     │                     │  technical_score (evaluator)  │
     │                     └──────────────────────────────┘
     │
     │ 1                  ┌──────────────────────────────┐
     ├───────────────────<│     FinancialBid              │
     │   1:1              │  total_amount, tax, discount  │
     │                    │  final_amount                 │
     │                    │  encrypted_payload            │
     │                    │  opened_at, opened_by         │
     │                    │  🔒 SEALED until opening       │
     │                    └──────────────────────────────┘
     │
     │ 1                  ┌──────────────────────────────┐
     ├───────────────────<│     BidAmendment              │
     │   1 N              │  amendment_number             │
     │                    │  reason, changed_sections     │
     │                    │  previous_version/new_version │
     │                    └──────────────────────────────┘
     │
     │ 1                  ┌──────────────────────────────┐
     ├───────────────────<│     BidWithdrawal             │
     │   1:1              │  reason, status               │
     │                    │  approved_by                  │
     │                    └──────────────────────────────┘
     │
     │ 1                  ┌──────────────────────────────┐
     ├───────────────────<│     BidAccessLog              │
     │   1 N              │  actor, action, outcome       │
     │                    │  ip_address, correlation_id   │
     │                    │  📋 SANITIZED metadata         │
     │                    └──────────────────────────────┘
     │
     │ 1                  ┌──────────────────────────────┐
     └───────────────────<│  BidIntegrityRecord           │
       1:1                │  integrity_hash (SHA-256)     │
                          │  status (PENDING/VERIFIED/    │
                          │          FAILURE/TAMPERED)    │
                          └──────────────────────────────┘

┌─────────────────────────┐     ┌──────────────────────────────┐
│     BidOpening          │────<│ BidOpeningAuthorization      │
│  (per tender)           │ 1 N │                              │
│  stage (6 stages)       │     │  user, role_in_opening       │
│  integrity_checks       │     │  authorized_by               │
│  technical/financial    │     └──────────────────────────────┘
│    opening metadata     │
└─────────────────────────┘
```

---

## 3. Bid Lifecycle State Machine

```
                                    ┌─────────┐
                                    │  DRAFT  │
                                    └────┬────┘
                                         │
                              ┌──────────┼──────────┐
                              v                     v
               ┌──────────────────────┐    ┌────────────┐
               │ SUBMISSION_IN_PROGRESS│   │  WITHDRAWN  │
               └──────────┬───────────┘    └────────────┘
                          │
              ┌───────────┼────────────┐
              v                        v
    ┌──────────────────┐    ┌──────────────────────┐
    │    SUBMITTED     │───>│  WITHDRAWAL_REQUESTED │
    └───────┬──────────┘    └──────────────────────┘
            │
   ┌────────┼────────────┐
   v        v            v
┌──────────────────┐  ┌──────────────────┐
│AMENDMENT_ALLOWED │  │     LOCKED       │
└───────┬──────────┘  └────────┬─────────┘
        │                      │
        v                      v
┌──────────────────┐  ┌──────────────────┐
│AMENDMENT_SUBMITTD│  │ TECHNICAL_OPENED │
└──────────────────┘  └────────┬─────────┘
                               │
                               v
                    ┌──────────────────┐
                    │TECHNICAL_EVALUATN│
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                v            v            v
    ┌──────────────────┐ ┌──────────┐ ┌──────────────┐
    │ FINANCIAL_OPEN_  │ │ REJECTED │ │ DISQUALIFIED │
    │   AUTHORIZED     │ └──────────┘ └──────────────┘
    └────────┬─────────┘
             │
             v
    ┌──────────────────┐
    │ FINANCIAL_OPENED │
    └────────┬─────────┘
             │
             v
    ┌──────────────────┐
    │    EVALUATED     │
    └───────┬──────────┘
            │
     ┌──────┼──────┐
     v             v
┌──────────┐ ┌──────────┐
│ AWARDED  │ │ REJECTED │
└──────────┘ └──────────┘

Terminal states: WITHDRAWN, AWARDED, REJECTED, DISQUALIFIED
```

### Allowed Transitions Table

| Current State | Allowed Target States |
|---------------|----------------------|
| DRAFT | SUBMISSION_IN_PROGRESS, WITHDRAWN |
| SUBMISSION_IN_PROGRESS | SUBMITTED, WITHDRAWAL_REQUESTED |
| SUBMITTED | AMENDMENT_ALLOWED, LOCKED, WITHDRAWAL_REQUESTED |
| AMENDMENT_ALLOWED | AMENDMENT_SUBMITTED, SUBMITTED, LOCKED, WITHDRAWAL_REQUESTED |
| AMENDMENT_SUBMITTED | AMENDMENT_ALLOWED, SUBMITTED, LOCKED, WITHDRAWAL_REQUESTED |
| WITHDRAWAL_REQUESTED | WITHDRAWN, SUBMITTED |
| LOCKED | TECHNICAL_OPENED |
| TECHNICAL_OPENED | TECHNICAL_EVALUATION |
| TECHNICAL_EVALUATION | FINANCIAL_OPENING_AUTHORIZED, REJECTED, DISQUALIFIED |
| FINANCIAL_OPENING_AUTHORIZED | FINANCIAL_OPENED |
| FINANCIAL_OPENED | EVALUATED |
| EVALUATED | AWARDED, REJECTED, DISQUALIFIED |

---

## 4. API Endpoints

### Bid Dashboard
- **`GET /api/v1/bids/dashboard/`**: Vendor/admin bid dashboard with metrics — total, draft, submitted, under evaluation, awarded, rejected, withdrawn counts plus recent bids.

### Bid CRUD
- **`GET /api/v1/bids/`**: List bids with filters (`search`, `status`, `tender`, `page`, `limit`). Vendors see only their own bids; admins see all.
- **`POST /api/v1/bids/`**: Create a new bid. Requires `tender_id` (and `vendor_id` for admin creation). Validates: tender open, deadline not passed, vendor verified, no duplicate active bid.
- **`GET /api/v1/bids/<uuid>/`**: Full bid detail with technical bid, documents, versions, amendments, timeline, integrity status. Financial data replaced with sealed status.
- **`PATCH /api/v1/bids/<uuid>/`**: Update draft bid notes.

### Bid Submission
- **`POST /api/v1/bids/<uuid>/submit/`**: Final submission. Server validates: deadline, tender status, technical bid complete, financial bid complete, mandatory documents present. Creates integrity record. Atomic transaction.

### Technical Bid
- **`GET /api/v1/bids/<uuid>/technical/`**: View technical proposal.
- **`PUT /api/v1/bids/<uuid>/technical/`**: Create/update technical proposal. Fields: methodology, technical_description, implementation_plan, delivery_plan, team_information, compliance_statement, equipment_details, quality_assurance.

### Financial Bid (STRICT ACCESS CONTROL)
- **`GET /api/v1/bids/<uuid>/financial/`**: View financial proposal. **Access logic:**
  - Vendor → sees own full data
  - Admin/Evaluator after opening → sees full data with opening metadata
  - Admin/Evaluator before opening → `{status: "SEALED"}`
  - Super Admin → sees data for audit purposes
  - Unauthorized → `{status: "SEALED"}`
- **`PUT /api/v1/bids/<uuid>/financial/`**: Create/update financial proposal. Fields: currency, total_amount, tax_amount, discount, final_amount (auto-calculated), pricing_breakdown. **Never logs financial values.**

### Documents
- **`GET /api/v1/bids/<uuid>/documents/`**: List bid documents (optional `?type=` filter).
- **`POST /api/v1/bids/<uuid>/documents/`**: Upload document. Validates MIME type (PDF, DOCX, XLSX, PNG, JPG). Creates audit log.
- **`DELETE /api/v1/bids/<uuid>/documents/<uuid>/`**: Soft-delete document.

### Amendment
- **`GET /api/v1/bids/<uuid>/amend/`**: List amendments.
- **`POST /api/v1/bids/<uuid>/amend/`**: Create amendment. Requires: `reason`. Validates: deadline not passed, bid in amendable state. Creates version snapshot. Transitions bid to AMENDMENT_SUBMITTED.

### Withdrawal
- **`POST /api/v1/bids/<uuid>/withdraw/`**: Withdraw bid. Requires: `reason`. Validates: bid in withdrawable state. Creates withdrawal record. Transitions to WITHDRAWN. Bid is never physically deleted.

### Version History
- **`GET /api/v1/bids/<uuid>/versions/`**: List immutable version snapshots with change summaries and integrity hashes.

### Integrity Verification
- **`GET /api/v1/bids/<uuid>/integrity/`**: View integrity record status.
- **`POST /api/v1/bids/<uuid>/integrity/`**: Trigger integrity verification. Recomputes SHA-256 and compares. On failure: INTEGRITY_FAILURE status, critical audit event.

### Bid Opening (Tender-Level)
- **`GET /api/v1/tenders/<uuid>/opening/`**: Get opening status for a tender — stage, counts, integrity status.
- **`POST /api/v1/tenders/<uuid>/opening/`**: Execute opening actions:
  - `authorize_technical` — Authorize technical opening (Super/Org/Tender Manager)
  - `open_technical` — Open technical bids (runs integrity checks first)
  - `authorize_financial` — Authorize financial opening (Super/Org Admin only)
  - `open_financial` — Open financial bids to authorized evaluators

### Audit Logs
- **`GET /api/v1/bids/<uuid>/audit-logs/`**: Bid-specific audit trail.
- **`GET /api/v1/bids/audit-logs/`**: Global bid audit logs with filters (`action`, `actor`, `outcome`).

---

## 5. Security Controls

### 5.1 Financial Bid Confidentiality

The financial bid is the most sensitive data in the system. Confidentiality is enforced at **three layers**:

**Layer 1 — Serializer Level:**
```python
# Before financial opening → sealed view only
class FinancialBidSealedSerializer:
    def to_representation(self, instance):
        return {
            'status': 'SEALED',
            'currency': instance.currency,
            'message': 'Financial details are sealed until authorized opening.'
        }
```

**Layer 2 — View Level:**
```python
# Access control logic in FinancialBidView.get()
if user.role == 'VENDOR':
    if bid.vendor.user != user:
        return Access Denied
    # Vendor always sees own data
    serializer = FinancialBidVendorSerializer(financial_bid)
elif is_opened:
    # After opening → authorized roles
    if user.role in [SUPER_ADMIN, ORG_ADMIN, TENDER_MANAGER, EVALUATOR]:
        serializer = FinancialBidFullSerializer(financial_bid)
else:
    # Before opening → sealed
    serializer = FinancialBidSealedSerializer(financial_bid)
```

**Layer 3 — Audit Log Sanitization:**
```python
# BidAccessLog.log() strips sensitive keys from metadata
sensitive_keys = {'password', 'secret', 'key', 'token', 'financial', 'amount', 'total'}
for k, v in metadata.items():
    if not any(sk in k.lower() for sk in sensitive_keys):
        safe_metadata[k] = v
```

### 5.2 Server-Side Deadline Enforcement

```python
# Deadline check always uses server time
if tender.submission_deadline and tender.submission_deadline <= timezone.now():
    raise ValueError("Submission deadline has passed. Server time is authoritative.")
```

The frontend countdown timer is cosmetic only. The backend independently validates deadlines on every submission, amendment, and withdrawal request.

### 5.3 Concurrent Modification Prevention

```python
# SELECT FOR UPDATE prevents race conditions
bid = Bid.objects.select_for_update().get(pk=bid.pk)
```

When two requests arrive simultaneously near the submission deadline, the database-level row lock ensures only one can proceed. The other will wait and then re-evaluate the updated state.

### 5.4 Bid Integrity Verification

```
Submission:
  Bid Data + Document Hashes + Version + Tender ID + Vendor ID
  → Canonical JSON Representation
  → SHA-256 Digest
  → Stored in BidIntegrityRecord

Opening:
  Recompute SHA-256 from current bid state
  → Compare with stored digest
  → Match: VERIFIED
  → Mismatch: INTEGRITY_FAILURE + Critical Audit Event + Notification
```

### 5.5 Role-Based Access Matrix

| Action | Vendor | Tender Manager | Org Admin | Super Admin | Evaluator |
|--------|--------|---------------|-----------|-------------|-----------|
| Create Bid | ✅ (own) | ❌ | ✅ (any) | ✅ (any) | ❌ |
| View Own Bid | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Any Bid | ❌ | ✅ | ✅ | ✅ | ✅ (after opening) |
| Edit Draft | ✅ (own) | ❌ | ✅ | ✅ | ❌ |
| Submit | ✅ (own) | ❌ | ✅ | ✅ | ❌ |
| Amend | ✅ (own) | ❌ | ✅ | ✅ | ❌ |
| Withdraw | ✅ (own) | ❌ | ✅ | ✅ | ❌ |
| View Financial (before) | ✅ (own) | ❌ | ❌ | ✅ (audit) | ❌ |
| View Financial (after) | ✅ (own) | ✅ | ✅ | ✅ | ✅ |
| Authorize Tech Opening | ❌ | ✅ | ✅ | ✅ | ❌ |
| Authorize Fin Opening | ❌ | ❌ | ✅ | ✅ | ❌ |
| Open Technical | ❌ | ✅ | ✅ | ✅ | ❌ |
| Open Financial | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 6. Celery Background Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `lock_expired_bids_task` | Every minute | Lock bids past submission deadline using server time |
| `verify_document_task` | On upload | Async document verification workflow (scan → verify → update) |
| `send_bid_notification_task` | On event | Send vendor notifications for bid lifecycle events |
| `check_deadline_and_notify_task` | Hourly | Alert vendors with draft bids when deadline is within 24 hours |

---

## 7. Bid Submission Wizard (Frontend)

The 8-step guided submission wizard walks vendors through the complete bid preparation process:

| Step | Name | Content |
|------|------|---------|
| 1 | Tender Eligibility | Displays tender details, budget, deadline, eligibility criteria |
| 2 | Bidder Information | Auto-populated from vendor profile |
| 3 | Technical Proposal | 8-field form (methodology, description, plan, team, compliance, etc.) |
| 4 | Documents | Upload interface for required bid documents |
| 5 | Financial Proposal | Currency, amounts, auto-calculated final amount |
| 6 | Declarations | 3 mandatory checkboxes (accuracy, finality, no conflict) |
| 7 | Review | Complete summary with completion indicators |
| 8 | Final Submission | Success confirmation with bid reference and timestamp |

---

## 8. Frontend Components

### BidManagementDashboard
- 4 metric cards (Total, Submitted, Under Evaluation, Awarded) with scroll-triggered animations
- Status-colored bid table with 16 distinct color schemes
- Live deadline countdown with urgency coloring
- Filter bar with text search and status dropdown
- Create Bid modal listing active tenders
- Bid Opening Panel button for admin users

### BidDetailPage
- 7-tab interface: Overview, Technical, Financial, Documents, Versions, Timeline, Audit
- Sealed financial card with lock animation when sealed
- Visual 10-stage tracking timeline
- Context-sensitive action buttons (Submit, Amend, Withdraw)
- Modals for: Technical form, Financial form, Amendment, Withdrawal (destructive confirmation)

### BidSubmissionWizard
- Step indicator with completion progress
- Auto-saves on step progression
- Previous/Next navigation
- Mandatory declaration checkboxes before final submission

### BidOpeningPanel
- Tender selector for admin users
- 4 metric cards (Received, Locked, Integrity Passed/Failed)
- 6-stage indicator with active stage highlight
- Technical and Financial opening sections with authorization buttons
- Session action log

---

## 9. Files Created/Modified

### New Backend Files
```
backend/bids/
├── __init__.py
├── apps.py                    # BidsConfig
├── models.py                  # 11 models (Bid, BidVersion, TechnicalBid, FinancialBid,
│                              #   BidDocument, BidAmendment, BidWithdrawal, BidOpening,
│                              #   BidOpeningAuthorization, BidAccessLog, BidIntegrityRecord)
├── services.py                # BidLifecycleService (16-state machine), BidIntegrityService
├── serializers.py             # 14 serializers with financial confidentiality enforcement
├── permissions.py             # 10 permission classes (object-level + role-based)
├── views.py                   # 15 view classes covering all API endpoints
├── urls.py                    # 16 URL patterns
├── tasks.py                   # 4 Celery background tasks
└── migrations/
    └── 0001_initial.py        # Full migration with indexes and constraints
```

### Modified Backend Files
```
backend/tenderx_backend/settings.py   # +INSTALLED_APPS bids
backend/tenderx_backend/urls.py       # +/api/v1/bids/ routes
```

### New Frontend Files
```
frontend/src/
├── api/bidsApi.js                     # Complete API client (25+ methods)
└── components/bids/
    ├── BidManagementDashboard.jsx      # Main dashboard with metrics and bid table
    ├── BidDetailPage.jsx              # 7-tab bid detail with all bid operations
    ├── BidSubmissionWizard.jsx        # 8-step guided submission wizard
    └── BidOpeningPanel.jsx            # Admin opening workflow control center
```

### Modified Frontend Files
```
frontend/src/App.jsx                   # Integrated BidManagementDashboard into navigation
```

---

## 10. Business Rules Enforced

1. A vendor can only have **one active bid per tender** unless the tender explicitly supports multiple bids.
2. Bids can only be created for **ACTIVE or PUBLISHED tenders** with future deadlines.
3. Vendors must be **VERIFIED** to create bids.
4. **Submission deadline** is enforced server-side on creation, submission, amendment, and withdrawal.
5. **Financial bid is sealed** until authorized financial opening by Super Admin or Org Admin.
6. **Technical opening must complete** before financial opening can be authorized.
7. **Integrity verification** runs before technical opening. Failure blocks opening (unless Super Admin overrides).
8. **Amendments create new versions** — previous versions are never overwritten.
9. **Withdrawn bids are never deleted** — WITHDRAWN state preserved for audit.
10. **Locked bids cannot be modified** — no document changes, no financial edits, no amendments.
11. **All state transitions are validated** — frontend status values are never trusted.
12. **Audit logs are sanitized** — passwords, keys, and financial values are never logged.
13. **Race conditions** are prevented via `SELECT FOR UPDATE` on critical transitions.
14. **Celery periodic tasks** automatically lock expired bids using server time.

---

## 11. Git Commits

```
f4094c3 feat(OTMS-42): add bid management frontend with submission wizard
bc732a1 feat(OTMS-42): add Celery tasks and register bids app in Django settings
c91e492 feat(OTMS-42): implement bid submission, amendment, withdrawal, and opening APIs
4663bfd feat(OTMS-42): add bid serializers with financial bid confidentiality
c436b6a feat(OTMS-42): implement bid lifecycle state machine and permission classes
81e6fbf feat(OTMS-42): add bid domain models and database migrations
```

**Branch**: `feature/otms-module-7-bids` → merged to `main`  
**Total**: 19 files changed, +5,560 lines

---

## 12. Roadmap Progress

- [x] **M1: Project Setup (Docker, Git, CI/CD, Django + React)**
- [x] **M2: User Authentication & Role-Based Access Control (RBAC)**
- [x] **M3: Advanced User Management & Authentication UI**
- [x] **M4: Tender Creation & BOQ Specification Management**
- [x] **M5: Encrypted Bid Submission Engine**
- [x] **M6: Vendor Management**
- [x] **M7: Bid Submission & Secure Bid Management** ✅ ← Current Module
- [ ] **M8: Real-time Reverse Auction Engine**
- [ ] **M9: Award of Contract & PO Generation**
- [ ] **M10: Payment Gateway & EMD Wallet Integration**
- [ ] **M11: Immutable Audit Logging & Security**
- [ ] **M12: Analytics, Spend Reports & Vendor Performance**
