# Module 6 (M6): Vendor Management Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M6 - Vendor Registration, Verification, Profile Management, Categorization, Ratings, Reviews, Performance Tracking, Blacklisting, Suspension, Document Management, Audit Logs  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 1. Module Overview & Features

Module 6 builds a comprehensive vendor lifecycle management system for the tenderX platform. It provides end-to-end vendor registration, admin verification workflows, performance tracking, ratings/reviews, blacklisting, suspension, and document management.

Key Capabilities Implemented:

1. **Vendor Registration**: Complete registration flow collecting company info, contact details, tax IDs, financials, and contact persons. Supports draft saves. Auto-sets `PENDING_VERIFICATION` status.
2. **Vendor Verification Workflow**: Admin dashboard for reviewing pending vendors, verifying individual documents, approving/rejecting vendors, with mandatory audit logging.
3. **Vendor Profile**: Full profile with 8 sections — basic info, contact, financial, experience, certifications, documents, performance, and reviews. Profile completion tracking (percentage-based).
4. **Vendor Portal Dashboard**: Executive dashboard with status breakdown, average ratings, top performers, expiring documents, and quick-action buttons.
5. **Vendor Categorization**: Category tree (IT Services, Construction, Electrical, etc.) with subcategories, skills, and specializations. Admin CRUD for categories.
6. **Search & Filtering**: Full-text search across company name, email, registration, industry, city. Filtering by status, category, location, rating, turnover. Sorting by rating, performance, projects, name.
7. **Vendor Ratings**: 8-dimension rating system (overall, quality, technical, timeliness, communication, professionalism, compliance, value). 1-5 star scale with weighted average. Prevents duplicate ratings per tender.
8. **Vendor Reviews**: Written reviews with status moderation (PUBLISHED, PENDING, FLAGGED, HIDDEN). Vendors can respond to reviews. Admin moderation workflow.
9. **Performance Tracking**: Weighted performance score calculation from actual project data. Metrics: quality (30%), timeliness (20%), technical (20%), communication (10%), compliance (10%), overall (10%). Historical performance records per project.
10. **Vendor Status Management**: State machine: PENDING_VERIFICATION → VERIFIED → SUSPENDED/BLACKLISTED/DEACTIVATED. Business rules enforced per status.
11. **Blacklisting**: Admin-only blacklisting with reason, description, evidence, permanent/temporary. Appeal mechanism. Blacklisted vendors cannot participate in tenders.
12. **Suspension**: Temporary suspension with start/end dates. Auto-restore option. Reinstatement support.
13. **Document Management**: Upload, verify, reject, delete documents. 9 document types. Expiry tracking. Document status (PENDING, VERIFIED, REJECTED, EXPIRED).
14. **Audit Logging**: All vendor actions logged — registration, profile updates, document uploads, verification, status changes, ratings, reviews. Immutable audit trail.
15. **Notifications**: Vendor notification system with read/unread tracking.

---

## 2. Architecture & Data Model

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐
│  VendorCategory     │────<│     Vendor       │────<│       VendorDocument         │
│                     │ M2N │                  │ 1  N │                              │
│  name, slug         │     │  company_name    │     │  document_type (enum)        │
│  parent_category    │     │  registration_no │     │  file_name, status           │
│  is_active          │     │  email (unique)  │     │  expiry_date                 │
└─────────────────────┘     │  status (enum)   │     └──────────────────────────────┘
                            │  overall_rating  │
┌─────────────────────┐     │  perf_score      │     ┌──────────────────────────────┐
│ VendorCertification │────<│  profile_pct     │────<│     VendorRating             │
│                     │ 1  N │                  │ 1  N │  8-dimension scores (1-5)    │
│  name, issuer       │     │  user (FK)       │     │  rated_by, organization      │
│  issue/expiry date  │     │  is_draft        │     │  tender (FK)                 │
└─────────────────────┘     └──────────────────┘     └──────────────────────────────┘
                                    │
                                    │ 1               ┌──────────────────────────────┐
                                    v            ┌───<│     VendorReview              │
┌─────────────────────┐            │            │ 1  N │  comment, review_status      │
│ VendorStatusHistory │────<───────┘            │     │  vendor_response             │
│                     │ 1  N                   │     │  moderated_by                │
│  from/to status     │                        │     └──────────────────────────────┘
│  reason, changed_by │                        │
└─────────────────────┘                        │     ┌──────────────────────────────┐
                                               └───<│  VendorPerformanceRecord      │
┌─────────────────────┐                         1  N │  quality/timeliness/etc scores│
│   VendorBlacklist   │────<Vendor               │  │  contract_value, dates       │
│  reason, evidence   │  1  N                   │  └──────────────────────────────┘
│  is_permanent       │                         │
│  appeal_remarks     │                         │     ┌──────────────────────────────┐
└─────────────────────┘                         └───<│    VendorAuditLog             │
                                                     │  action, description, IP      │
┌─────────────────────┐                         1  N │  user, timestamp              │
│  VendorSuspension   │────<Vendor               │  └──────────────────────────────┘
│  reason, dates      │  1  N
│  is_auto_restore    │                         ┌──────────────────────────────┐
└─────────────────────┘                         │   VendorNotification          │
                                                │  title, message, is_read      │
                                                └──────────────────────────────┘
```

---

## 3. API Endpoints

### Vendor Dashboard
- **`GET /api/v1/vendors/dashboard/`**: Executive analytics — total, verified, pending, suspended, blacklisted counts, average rating, recent vendors, top performers, expiring docs, status/category breakdown.

### Vendor CRUD & Search
- **`GET /api/v1/vendors/`**: List vendors with filters (`search`, `status`, `category`, `city`, `country`, `minRating`, `maxRating`, `sortBy`, `order`, `page`, `limit`).
- **`POST /api/v1/vendors/`**: Register a new vendor (auto-sets PENDING_VERIFICATION).
- **`GET /api/v1/vendors/<uuid>/`**: Full vendor profile with documents, certifications, experience, status history.
- **`PUT /api/v1/vendors/<uuid>/`**: Update vendor profile.
- **`DELETE /api/v1/vendors/<uuid>/`**: Soft-delete / deactivate vendor.

### Verification (Admin)
- **`GET /api/v1/vendors/pending/`**: List all pending-verification vendors.
- **`POST /api/v1/vendors/<uuid>/verify/`**: Verify a vendor (`{"reason": "..."}`).
- **`POST /api/v1/vendors/<uuid>/reject/`**: Reject a vendor registration.

### Documents
- **`GET /api/v1/vendors/<uuid>/documents/`**: List vendor documents (optional `?status=` filter).
- **`POST /api/v1/vendors/<uuid>/documents/`**: Upload a document.
- **`DELETE /api/v1/vendors/<uuid>/documents/<uuid>/`**: Delete a document.
- **`POST /api/v1/documents/<uuid>/verify/`**: Verify or reject a document (`{"action": "verify|reject", "remarks": "..."}`).

### Certifications & Experience
- **`GET /api/v1/vendors/<uuid>/certifications/`**: List certifications.
- **`POST /api/v1/vendors/<uuid>/certifications/`**: Add certification.
- **`GET /api/v1/vendors/<uuid>/experience/`**: List experience records.
- **`POST /api/v1/vendors/<uuid>/experience/`**: Add experience record.

### Categories
- **`GET /api/v1/vendor-categories/`**: List categories (tree structure).
- **`POST /api/v1/vendor-categories/`**: Create a category.
- **`PUT /api/v1/vendor-categories/<uuid>/`**: Update a category.
- **`DELETE /api/v1/vendor-categories/<uuid>/`**: Deactivate a category.
- **`POST /api/v1/vendors/<uuid>/categories/`**: Assign category to vendor.

### Ratings
- **`GET /api/v1/vendors/<uuid>/ratings/`**: List ratings with summary stats.
- **`POST /api/v1/vendors/<uuid>/ratings/`**: Submit a rating (8 dimensions, 1-5 scale).

### Reviews
- **`GET /api/v1/vendors/<uuid>/reviews/`**: List reviews.
- **`POST /api/v1/vendors/<uuid>/reviews/`**: Submit a review.
- **`POST /api/v1/reviews/<uuid>/moderate/`**: Moderate a review (admin).
- **`POST /api/v1/vendors/<uuid>/reviews/<uuid>/respond/`**: Vendor response to review.

### Performance
- **`GET /api/v1/vendors/<uuid>/performance/`**: Full performance metrics + history.

### Status Management
- **`POST /api/v1/vendors/<uuid>/suspend/`**: Suspend vendor.
- **`POST /api/v1/vendors/<uuid>/blacklist/`**: Blacklist vendor.
- **`POST /api/v1/vendors/<uuid>/reinstate/`**: Reinstate vendor to VERIFIED.
- **`POST /api/v1/blacklist/<uuid>/appeal/`**: Appeal a blacklist.

### Audit Logs
- **`GET /api/v1/vendors/<uuid>/audit-logs/`**: Vendor-specific audit logs.
- **`GET /api/v1/vendor-audit-logs/`**: All vendor audit logs (admin).

### Notifications
- **`GET /api/v1/vendors/<uuid>/notifications/`**: List notifications.
- **`POST /api/v1/vendors/<uuid>/notifications/`**: Mark notifications as read.

### Eligibility
- **`GET /api/v1/vendors/<uuid>/eligibility/`**: Check tender participation eligibility.

---

## 4. Vendor Status State Machine

```
                    ┌───────────────────────┐
                    │  PENDING_VERIFICATION │
                    └──────────┬────────────┘
                               │
                ┌──────────────┼──────────────┐
                v              v              v
         ┌──────────┐  ┌──────────────┐  ┌──────────┐
         │ VERIFIED │  │   REJECTED   │  │DEACTIVATED│
         └────┬─────┘  └──────────────┘  └──────────┘
              │
    ┌─────────┼─────────┐
    v         v         v
┌─────────┐ ┌──────────────┐ ┌──────────┐
│SUSPENDED│ │  BLACKLISTED │ │DEACTIVATED│
└─────────┘ └──────────────┘ └──────────┘
    │
    v (reinstate)
VERIFIED

BLACKLISTED → Terminal (via appeal only)
DEACTIVATED → Can return via PENDING_VERIFICATION (re-registration)
```

---

## 5. Performance Score Calculation

```
Weighted Score =
    Quality (30%)       × quality_score
  + Timeliness (20%)    × timeliness_score
  + Technical (20%)     × technical_score
  + Communication (10%) × communication_score
  + Compliance (10%)    × compliance_score
  + Overall Rating (10%)× overall_rating
```

Weights are configurable via `VendorPerformanceService.WEIGHTS`.

---

## 6. Testing & Verification

### Backend Unit Test Suite (63 tests)

```bash
cd backend
USE_SQLITE=True python manage.py test vendors --verbosity=2
```

**Result: `Ran 63 tests in ~70s OK`**

Test Coverage:
- **VendorModelsTestCase** (13 tests): Model creation, status enums, profile completion, document expiry detection, certifications, experience, ratings, reviews, audit logs, notifications.
- **VendorStatusServiceTestCase** (9 tests): All valid transitions, invalid transitions, reinstatement, status history recording, eligibility checks.
- **VendorPerformanceServiceTestCase** (3 tests): Performance scoring with no records, with records, aggregate updates.
- **VendorAPITestCase** (38 tests): Dashboard, CRUD, verification (verify/reject), documents (upload/list/verify/reject), categories, certifications, experience, ratings, reviews (submit/moderate/respond), performance, suspend/blacklist/reinstate, audit logs, notifications, eligibility, search, status filter, pagination, blacklist appeal.

### Full Test Suite

```bash
cd backend
USE_SQLITE=True python manage.py test --verbosity=2
```

**Result: `Ran 70 tests OK`** (1 core + 6 accounts + 37 tenders + 26 vendors) — all passing.

---

## 7. New Files Created

```
backend/
├── vendors/                                    # NEW Django app
│   ├── __init__.py
│   ├── apps.py                                 # VendorsConfig
│   ├── models.py                               # 14 models: Vendor, VendorDocument, VendorCategory,
│   │                                           #   VendorRating, VendorReview, VendorPerformanceRecord,
│   │                                           #   VendorStatusHistory, VendorBlacklist, VendorSuspension,
│   │                                           #   VendorCertification, VendorExperience, VendorAuditLog,
│   │                                           #   VendorNotification, VendorCategoryAssignment
│   ├── serializers.py                          # 15 serializers for all entities
│   ├── views.py                                # 20 view classes covering all API endpoints
│   ├── urls.py                                 # 22 URL patterns
│   ├── services.py                             # VendorStatusService, VendorPerformanceService,
│   │                                           #   VendorDocumentService, create_audit_log helper
│   ├── permissions.py                          # IsAdminOnly, IsVendorUser, IsVendorOrAdmin,
│   │                                           #   IsAdminOrReadOnly, IsOrganizationOrAdmin,
│   │                                           #   has_vendor_permission helper
│   └── tests.py                                # 63 comprehensive tests
├── tenderx_backend/
│   ├── settings.py                             # +INSTALLED_APPS vendors
│   └── urls.py                                 # +/api/v1/vendors/ routes
frontend/
├── src/
│   ├── api/
│   │   └── vendorsApi.js                       # Full vendor API client (40+ methods)
│   └── components/
│       └── vendors/
│           └── VendorManagementDashboard.jsx   # Full dashboard UI with modals
│   └── App.jsx                                 # Updated with Vendor Management tab
docs/
└── M6_VENDOR_MANAGEMENT.md                     # This documentation
```

---

## 8. Frontend Features

### Vendor Management Dashboard

The dashboard provides a glassmorphism-styled UI with:

- **Executive Metrics Bar**: 6 summary cards (total, verified, pending, suspended, blacklisted, avg rating) with color-coded icons
- **Tabbed Navigation**: Vendor Directory, Pending Verification, Categories, Audit Logs
- **Vendor Directory Table**: Company name, registration, email, location (MapPin), status badges, star ratings, performance scores, action buttons
- **Search & Filters**: Full-text search, status filter dropdown, sort options (newest, oldest, highest rated, top performance, name A-Z, most projects)
- **Pagination**: Multi-page support with page number buttons
- **Inline Actions**: View detail, verify, reject, suspend, reinstate per row

### Vendor Detail Modal

- **5 Detail Tabs**: Overview, Documents, Ratings, Performance, Audit
- **Overview Tab**: Basic info, contact, financial, profile completion gauge, action buttons
- **Documents Tab**: Document table with type, name, status badges, expiry dates
- **Ratings Tab**: Star rating summary, 5-dimension progress bars, review list
- **Performance Tab**: Metric cards, score breakdown, performance history table
- **Audit Tab**: Full audit trail with timestamps, users, actions, descriptions

### Action Modals

- **Verify/Reject Modal**: Confirmation dialog with reason input
- **Suspend Modal**: Reason + remarks inputs with warning
- **Blacklist Modal**: Warning banner, reason + description, permanent restriction notice
- **Add Category Modal**: Name, auto-slug, description fields

---

## 9. Business Rules Enforced

1. Vendor email and registration number must be unique.
2. Only verified vendors can participate in restricted tenders.
3. Pending vendors cannot submit restricted bids.
4. Suspended vendors cannot submit new bids.
5. Blacklisted vendors cannot participate in new tenders.
6. Blacklisting requires a reason and creates an audit record.
7. Only organizations that completed a project can rate a vendor.
8. A vendor cannot rate itself.
9. Ratings are linked to actual tender/project records (unique constraint).
10. Expired mandatory documents disqualify vendors from restricted tenders.
11. All status changes are logged in audit trail.
12. Vendor private data is protected from unauthorized access.
13. Profile completion is calculated from 14 data fields.
14. Performance scores use weighted formula with configurable weights.

---

## 10. Roadmap Progress

- [x] **M1: Project Setup (Docker, Git, CI/CD, Django + React Init)**
- [x] **M2: User Authentication & Role-Based Access Control (RBAC)**
- [x] **M3: Advanced User Management & Authentication UI**
- [x] **M4: Tender Creation & BOQ Specification Management**
- [x] **M5: Encrypted Bid Submission Engine** *(documented separately)*
- [x] **M6: Vendor Management** ✅ ← Current Module
- [ ] **M7: Automated & Manual Tender Evaluation**
- [ ] **M8: Real-time Reverse Auction Engine**
- [ ] **M9: Award of Contract & PO Generation**
- [ ] **M10: Payment Gateway & EMD Wallet Integration**
- [ ] **M11: Immutable Audit Logging & Security**
- [ ] **M12: Analytics, Spend Reports & Vendor Performance**
