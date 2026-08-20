# Module 4 (M4): Tender Creation & BOQ Specification Management Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M4 - Tender CRUD APIs, Lifecycle Management (Draft → Published → Active → Evaluation → Awarded → Closed), Tender Categories, Search & Filtering, Tender Templates, Amendment Management, BOQ Specifications  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 🎯 1. Module Overview & Features

Module 4 builds the core tender management backbone of the tenderX platform. It provides full CRUD operations, a state-machine-driven lifecycle, BOQ specification management, amendment tracking, and template-based tender creation.

Key Capabilities Implemented:
1. **Tender CRUD APIs**: Full create, read, update, and soft-delete operations for tenders with auto-generated tender numbers (TDR-YYYY-XXXX format).
2. **Tender Lifecycle State Machine**: Enforced valid transitions: `Draft → Published → Active → Evaluation → Awarded → Closed` with cancellation from any non-terminal state. Each transition updates lifecycle timestamps.
3. **Tender Categories**: Seeded category catalog (IT Infrastructure, Civil Construction, Energy & Utilities, Healthcare, etc.) with CRUD operations and deactivation.
4. **Search & Filtering**: Full-text search across title, description, tender number, organization name, and location. Filtering by status, category, organization, cost range, two-envelope flag, reverse auction eligibility, and expiring-soon deadlines.
5. **Tender Templates**: Pre-configured templates (Standard IT Procurement, Civil Works, Consulting Services) with default terms, requirements, and category associations. Create tenders from templates with pre-populated fields.
6. **Amendment Management**: Versioned amendment tracking for published/active tenders with auto-incrementing amendment numbers, change summaries, and JSON snapshots of previous/new values. Tender version bumped on each amendment.
7. **Bill of Quantities (BOQ)**: Line-item BOQ management with auto-calculated total prices (quantity × unit_price), item CRUD, and aggregate total value calculation.
8. **Document Attachments**: Support for attaching RFP, BOQ, Technical Specs, Terms & Conditions, Addendum, and Amendment documents to tenders.
9. **Dashboard Analytics**: Executive summary with status breakdown, category-wise value analysis, upcoming deadlines, and recent tenders.
10. **Bulk Lifecycle Transitions**: Batch transition multiple tenders to a new status in a single API call.

---

## 🏗️ 2. Architecture & Data Model

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│  TenderCategory │────<│     Tender       │────<│       BOQItem            │
│                 │ 1  N │                  │ 1  N │                          │
└─────────────────┘     │  tender_number   │     │  item_number             │
                        │  title           │     │  description             │
┌─────────────────┐     │  status (enum)   │     │  quantity × unit_price   │
│ TenderTemplate  │────<│  estimated_cost  │     └──────────────────────────┘
│                 │ 1  N │  submission_deadline│
│  default_terms  │     │  version         │     ┌──────────────────────────┐
│  default_reqs   │     │  lifecycle TS    │────<│    TenderAmendment       │
└─────────────────┘     │  is_two_envelope │ 1  N │  amendment_number        │
                        │  reverse_auction │     │  changes_summary         │
                        └──────────────────┘     │  previous_values (JSON)  │
                                │                 │  new_values (JSON)       │
                                │ 1               └──────────────────────────┘
                                v
                        ┌──────────────────┐
                        │ TenderDocument   │
                        │  document_type   │
                        │  file_url        │
                        └──────────────────┘
```

---

## 🔌 3. Module 4 API Specifications

### Tender Dashboard
- **`GET /api/v1/tenders/dashboard/`**: Executive analytics — status breakdown, category stats, upcoming deadlines, recent tenders.

### Tender CRUD
- **`GET /api/v1/tenders/`**: List tenders with query filters (`search`, `status`, `category`, `organization`, `is_two_envelope`, `is_reverse_auction`, `min_cost`, `max_cost`, `sort_by`, `expiring_soon`).
- **`POST /api/v1/tenders/`**: Create a new tender (starts in Draft status).
- **`GET /api/v1/tenders/<uuid>/`**: Full tender detail with nested BOQ items, amendments, and documents.
- **`PATCH /api/v1/tenders/<uuid>/`**: Update a Draft tender's fields.
- **`DELETE /api/v1/tenders/<uuid>/`**: Soft-delete a Draft tender.

### Lifecycle Transitions
- **`POST /api/v1/tenders/<uuid>/transition/`**: Transition tender to a new status (`{"status": "PUBLISHED"}`).
- **`POST /api/v1/tenders/bulk-transition/`**: Bulk transition: `{"tender_ids": [...], "status": "ACTIVE"}`.

### BOQ Management
- **`GET /api/v1/tenders/<uuid>/boq-items/`**: List BOQ items with total value.
- **`POST /api/v1/tenders/<uuid>/boq-items/`**: Add a BOQ line item.
- **`PATCH /api/v1/tenders/<uuid>/boq-items/<uuid>/`**: Update a BOQ item.
- **`DELETE /api/v1/tenders/<uuid>/boq-items/<uuid>/`**: Remove a BOQ item.

### Amendment Management
- **`GET /api/v1/tenders/<uuid>/amendments/`**: List amendments for a tender.
- **`POST /api/v1/tenders/<uuid>/amendments/`**: Create a new amendment (auto-increments number, bumps tender version).

### Document Attachments
- **`GET /api/v1/tenders/<uuid>/documents/`**: List attached documents.
- **`POST /api/v1/tenders/<uuid>/documents/`**: Attach a document.

### Categories
- **`GET /api/v1/tenders/categories/`**: List all active categories (auto-seeds defaults).
- **`POST /api/v1/tenders/categories/`**: Create a new category.
- **`GET /api/v1/tenders/categories/<uuid>/`**: Get category detail.
- **`PATCH /api/v1/tenders/categories/<uuid>/`**: Update category.
- **`DELETE /api/v1/tenders/categories/<uuid>/`**: Soft-deactivate category.

### Templates
- **`GET /api/v1/tenders/templates/`**: List all active templates (auto-seeds defaults).
- **`POST /api/v1/tenders/templates/`**: Create a new template.
- **`GET /api/v1/tenders/templates/<uuid>/`**: Get template detail.
- **`PATCH /api/v1/tenders/templates/<uuid>/`**: Update template.
- **`DELETE /api/v1/tenders/templates/<uuid>/`**: Soft-deactivate template.
- **`POST /api/v1/tenders/templates/<uuid>/create-tender/`**: Create a tender pre-populated from a template.

---

## 🔄 4. Lifecycle State Machine

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ PUBLISHED / CANCELLED
              ┌──────────▼──────────┐
              │     PUBLISHED       │
              └──────────┬──────────┘
                         │ ACTIVE / CANCELLED
              ┌──────────▼──────────┐
              │      ACTIVE         │
              └──────────┬──────────┘
                         │ EVALUATION / CANCELLED
              ┌──────────▼──────────┐
              │    EVALUATION       │
              └──────────┬──────────┘
                         │ AWARDED / CLOSED
              ┌──────────▼──────────┐
              │     AWARDED         │
              └──────────┬──────────┘
                         │ CLOSED
              ┌──────────▼──────────┐
              │      CLOSED         │  ← Terminal
              └─────────────────────┘

CANCELLED ← Any non-terminal state
```

---

## 🧪 5. Testing & Verification

1. **Backend Unit Test Suite (37 tests)**:
   ```bash
   cd backend
   USE_SQLITE=True python manage.py test tenders --verbosity=2
   ```
   *Result: `Ran 37 tests in 0.784s OK`*

   Test coverage includes:
   - **TenderCategoryTests** (4 tests): List, create, detail, deactivate
   - **TenderTemplateTests** (4 tests): List, create, detail, create-tender-from-template
   - **TenderCRUDTests** (12 tests): Create, list with metrics, detail, update draft, reject non-draft edit, soft-delete, search, status filter, category filter, cost range filter, sorting
   - **TenderLifecycleTests** (9 tests): All valid transitions (Draft→Published, Published→Active, Active→Evaluation, Evaluation→Awarded, Awarded→Closed), invalid transition rejection, cancel from Draft/Active, Closed terminal state
   - **BOQTests** (4 tests): Add item, list with total, update item (auto-recalc total), delete item
   - **AmendmentTests** (4 tests): Create amendment, list, reject Draft amendment, auto-numbering
   - **TenderDashboardTests** (1 test): Dashboard response with summary and recent tenders

2. **Full Test Suite**:
   ```bash
   cd backend
   USE_SQLITE=True python manage.py test --verbosity=2
   ```
   *Result: `Ran 47 tests OK` (1 core + 9 accounts + 37 tenders)*

---

## 📁 6. New Files Created

```
backend/
├── tenders/                          # NEW Django app
│   ├── __init__.py
│   ├── apps.py                       # TendersConfig
│   ├── models.py                     # Tender, BOQItem, TenderAmendment, TenderDocument,
│   │                                 #   TenderCategory, TenderTemplate
│   ├── serializers.py                # List, Detail, Create/Update serializers
│   ├── views.py                      # CRUD, Lifecycle, BOQ, Amendments, Categories,
│   │                                 #   Templates, Dashboard, Documents
│   ├── urls.py                       # 16 API endpoints
│   └── tests.py                      # 37 comprehensive tests
├── tenderx_backend/
│   ├── settings.py                   # +INSTALLED_APPS tenders
│   └── urls.py                       # +/api/v1/tenders/ route
frontend/
├── src/
│   ├── api/
│   │   └── tendersApi.js             # Tender API client
│   └── components/
│       └── tenders/
│           └── TenderManagementDashboard.jsx  # Full dashboard UI
│   └── App.jsx                       # Updated with TenderManagementDashboard tab
docs/
└── M4_TENDER_MANAGEMENT.md           # This documentation
```

---

## 🗺️ 7. Roadmap Progress

- [x] **M1: Project Setup (Docker, Git, CI/CD, Django + React Init)**
- [x] **M2: User Authentication & Role-Based Access Control (RBAC)**
- [x] **M3: Advanced User Management & Authentication UI**
- [x] **M4: Tender Creation & BOQ Specification Management** ✅ ← You are here
- [ ] **M5: Encrypted Bid Submission Engine**
- [ ] **M6: Automated & Manual Tender Evaluation**
- [ ] **M7: Real-time Reverse Auction Engine**
- [ ] **M8: Award of Contract & PO Generation**
- [ ] **M9: Payment Gateway & EMD Wallet Integration**
- [ ] **M10: Immutable Audit Logging & Security**
- [ ] **M11: Real-time Notifications & WebSocket Service**
- [ ] **M12: Analytics, Spend Reports & Vendor Performance**
