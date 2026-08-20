# Module 5 (M5): Tender Management Engine Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M5 - Tender Data Models, State Machine Lifecycle Engine, Hierarchical Categories, Advanced Search, Templates, Amendment Versioning, RBAC & Audit Logging  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 🎯 1. Module Overview & Features

Module 5 implements the complete **Tender Management Engine** allowing procurement officers, administrators, evaluators, and vendors to manage the full tender lifecycle safely and transparently.

Key Capabilities Delivered:
1. **Centralized State Machine Engine (`TenderLifecycleService`)**:
   - Enforces strict transition validation across 7 status states: `DRAFT` → `PUBLISHED` → `ACTIVE` → `EVALUATION` → `AWARDED` → `CLOSED` or `CANCELLED`.
   - Prevents illegal jumps (e.g. `DRAFT` → `AWARDED` ❌ or `CLOSED` → `ACTIVE` ❌).
   - Validates publishing readiness before publishing (title, category, positive budget, future submission deadline).

2. **Hierarchical Categories & Multi-Field Search**:
   - Nestable tender categories (`TenderCategory`).
   - Advanced search API (`/api/v1/tenders/`) supporting debounced text query (`q`/`search`), status filtering, category filtering, organization filtering, and budget range (`minBudget`/`maxBudget`).

3. **Reusable Tender Templates Engine**:
   - Pre-configured tender templates (`TenderTemplate`).
   - One-click template application (`POST /api/v1/tender-templates/<id>/apply/`) creating fresh `DRAFT` tenders with unique tender numbers (`TND-YYYY-XXXXXX`).

4. **Amendment Management & Version Control**:
   - Published/Active tenders cannot be modified directly.
   - Versioned amendments (`TenderAmendment`) capture structured field changes.
   - Publishing an amendment increments tender version (`v1` → `v2`), applies updates, creates a immutable `TenderVersion` snapshot, and logs audit events.

5. **RBAC & Concurrency Control**:
   - Permission guards: `IsTenderManagerOrAdmin`, `CanViewTender`, `CanEditTender`.
   - Optimistic locking version check returning `HTTP 409 Conflict` on race conditions.

---

## 🔄 2. State Machine Lifecycle Matrix

```
DRAFT ──(Publish)──> PUBLISHED ──(Launch)──> ACTIVE ──(Deadline)──> EVALUATION ──(Select L1)──> AWARDED ──(Execute)──> CLOSED
  │                      │                     │                         │
  └─────(Cancel)─────────┴──────(Cancel)───────┴────────(Cancel)─────────┘
```

---

## 🔌 3. Module 5 REST API Specifications

### Tender CRUD & Lifecycle APIs
- **`GET /api/v1/tenders/`**: Paginated tender list with search and multi-field filtering.
- **`POST /api/v1/tenders/`**: Create new tender in `DRAFT` status with auto-generated tender number.
- **`GET /api/v1/tenders/<uuid>/`**: Detailed tender view including status history and versions.
- **`PATCH /api/v1/tenders/<uuid>/`**: Edit draft tender details (with optimistic version concurrency check).
- **`DELETE /api/v1/tenders/<uuid>/`**: Soft delete draft tender.
- **`POST /api/v1/tenders/<uuid>/transition/`**: Trigger lifecycle state transition.

### Categories & Templates APIs
- **`GET/POST /api/v1/tender-categories/`**: List hierarchical categories or create new category.
- **`DELETE /api/v1/tender-categories/<uuid>/`**: Deactivate category (prevented if active tenders exist).
- **`GET/POST /api/v1/tender-templates/`**: List/create reusable tender templates.
- **`POST /api/v1/tender-templates/<uuid>/apply/`**: Instantiate new draft tender from template.

### Amendments & Versioning APIs
- **`GET/POST /api/v1/tenders/<uuid>/amendments/`**: List or issue amendment draft.
- **`POST /api/v1/tenders/<uuid>/amendments/<aid>/publish/`**: Publish amendment and update tender version.
- **`GET /api/v1/tenders/<uuid>/versions/`**: View historical version snapshots.

---

## 🧪 4. Testing & Verification

1. **Backend Unit & Integration Test Suite**:
   ```bash
   cd backend
   USE_SQLITE=True python3 manage.py test tenders.tests accounts.tests core.tests
   ```
   *Result: `Ran 16 tests in 12.744s OK`*

2. **Frontend Production Compilation**:
   ```bash
   cd frontend
   npm run build
   ```
   *Result: `✓ built in 982ms`*
