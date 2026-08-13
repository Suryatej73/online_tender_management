# Module 3 (M3): Advanced User Management & Authentication UI Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M3 - Advanced User Management, Granular Permissions Matrix, Split-Screen Authentication UI, Organization/Department Structuring, Account Lockout & Audit Logging  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 🎯 1. Module Overview & Features

Module 3 expands the tenderX platform from foundational authentication (Module 2) into a complete, enterprise-grade **User Administration & Onboarding System**.

Key Capabilities Added:
1. **User Management Dashboard (`UserManagementDashboard.jsx`)**:
   - Executive metrics tracking Total Users, Active Users, Verified Accounts, Pending Approvals, and Locked Accounts.
   - Comprehensive user table (`UserTable.jsx`) with status indicators, role tags, department pills, and quick action context menus.
   - Real-time search and multi-facet filtering toolbar (`UserFiltersToolbar.jsx`) filtering by role, account status, department, and organization.

2. **Granular Permission Matrix (`PermissionMatrix.jsx`)**:
   - Fine-grained control allowing Super Admins and Org Admins to inspect and grant custom module-level permission overrides across 6 core roles.

3. **User Management Modals (`AddEditUserModal.jsx` & `UserProfileModal.jsx`)**:
   - Modal for creating new users or updating existing user details, assigned RBAC role, department, organization, and account flags (`is_active`, `is_staff`, `is_email_verified`, `is_mfa_enabled`).
   - Profile drawer displaying detailed user history, security policy status, login attempt logs, and active session details.

4. **Split-Screen Enterprise Auth UI (`SplitScreenAuth.jsx`)**:
   - Modern split-screen layout with branding panel, features carousel, and seamless transitions between Login, Registration, MFA Verification, and Password Reset.

5. **Backend Data Models & Security Extensions**:
   - **`Organization`**: Multi-tenant organization hierarchy with domain and tax ID tracking.
   - **`Department`**: Departmental divisions within organizations.
   - **`Permission` & `Group`**: System and custom permission definitions.
   - **`LoginAttempt`**: Security log tracking failed/successful login attempts with IP address and automatic lockout enforcement after consecutive failures.
   - **`AuditLog`**: Immutable audit logs capturing user actions, timestamps, IP addresses, and payload diffs.
   - **`SecurityPolicy`**: Organization-level security rules (password expiry days, lockout thresholds, session timeouts, mandatory MFA).

---

## 🏗️ 2. Extended Database Models (`backend/accounts/models.py`)

```
+------------------+         +--------------------+         +-----------------------+
|   Organization   |--------<|     Department     |--------<|         User          |
|                  | 1     N |                    | 1     N | (Custom AbstractUser) |
+------------------+         +--------------------+         +-----------------------+
                                                                |         |
                                         +----------------------+         +----------------------+
                                       1 |                      N       1 |                      N
                                         v                                v
                               +--------------------+           +--------------------+
                               |    LoginAttempt    |           |      AuditLog      |
                               +--------------------+           +--------------------+
```

---

## 🔌 3. Module 3 API Specifications

### Admin User Management APIs
- **`GET /api/v1/auth/admin/users/`**: List users with query filters (`q`, `role`, `status`, `department`).
- **`POST /api/v1/auth/admin/users/`**: Admin creation of a new user.
- **`PUT /api/v1/auth/admin/users/<uuid>/`**: Admin update of user details, role, department, or account flags.
- **`DELETE /api/v1/auth/admin/users/<uuid>/`**: Soft-delete or deactivate user account.

### Organization & Department APIs
- **`GET /api/v1/auth/admin/organizations/`**: List organizations.
- **`POST /api/v1/auth/admin/organizations/`**: Create new organization tenant.
- **`GET /api/v1/auth/admin/departments/`**: List departments by organization.
- **`POST /api/v1/auth/admin/departments/`**: Create new department.

### Security, Audit & Policy APIs
- **`GET /api/v1/auth/admin/permissions/`**: List system permissions and user permission overrides.
- **`POST /api/v1/auth/admin/permissions/override/`**: Grant or revoke specific permission override to a user.
- **`GET /api/v1/auth/admin/audit-logs/`**: Fetch immutable audit log entries.
- **`GET /api/v1/auth/admin/security-policies/`**: Fetch and update organization security policies.

---

## 🧪 4. Testing & Verification

1. **Backend Unit Test Suite**:
   ```bash
   cd backend
   USE_SQLITE=True python3 manage.py test accounts core
   ```
   *Result: `Ran 10 tests in 10.814s OK`*

2. **Frontend Production Compilation**:
   ```bash
   cd frontend
   npm run build
   ```
   *Result: `✓ built in 1.11s`*
