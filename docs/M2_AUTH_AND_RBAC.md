# Module 2 (M2): Authentication, RBAC & Security Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M2 - User Authentication, Role-Based Access Control (RBAC), Multi-Factor Authentication (MFA), Email Verification, Password Reset & Session Management  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 🎯 1. Module Overview & Features

Module 2 provides comprehensive security, identity management, and fine-grained Role-Based Access Control (RBAC) for **tenderX**.

Key Capabilities Implemented:
1. **JWT-Based Authentication**: Secure stateless authentication using Short-Lived Access Tokens (30 mins) and Long-Lived Refresh Tokens (7 days) with token rotation.
2. **6-Role RBAC Model**: Granular role-based authorization across **Super Admin**, **Organization Admin**, **Tender Manager**, **Vendor / Bidder**, **Evaluator**, and **Auditor**.
3. **Multi-Factor Authentication (MFA / 2FA)**: Time-based One-Time Password (TOTP) generation compatible with Google Authenticator and Authy apps with QR code generation.
4. **Email Verification**: One-time token generation for confirming email address ownership.
5. **Password Reset Workflow**: Secure link/token request and password confirmation.
6. **Session Tracking & Revocation**: Active JWT session tracking with IP address, device type, last activity timestamp, and remote session termination.

---

## 👥 2. RBAC Permissions Matrix

| Feature / System Module | Super Admin | Org Admin | Tender Manager | Vendor | Evaluator | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manage Users & Assign Roles** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create & Publish Tenders** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Submit Technical & Financial Bids** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Evaluate & Score Bids** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Participate in Live Reverse Auctions** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Award Contract & Issue PO** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Audit Logs & Compliance Trails** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 🔌 3. Module 2 API Specifications

### Authentication Endpoints
- **`POST /api/v1/auth/register/`**: Register a new user with custom role selection.
- **`POST /api/v1/auth/login/`**: Step 1 credentials authentication (returns tokens or `mfa_required: true`).
- **`POST /api/v1/auth/login/mfa/`**: Step 2 TOTP authentication verification.
- **`POST /api/v1/auth/refresh/`**: Obtain new access token using refresh token.
- **`GET /api/v1/auth/me/`**: Get authenticated user profile and permissions.
- **`POST /api/v1/auth/email/verify/`**: Verify user email using one-time token.
- **`POST /api/v1/auth/password/reset-request/`**: Issue password reset token.
- **`POST /api/v1/auth/password/reset-confirm/`**: Reset password using valid token.

### MFA & Session Endpoints
- **`POST /api/v1/auth/mfa/setup/`**: Generate secret key & QR code URI for authenticator app.
- **`POST /api/v1/auth/mfa/verify-setup/`**: Verify test TOTP code to activate MFA.
- **`GET /api/v1/auth/sessions/`**: List active sessions for authenticated user.
- **`POST /api/v1/auth/sessions/revoke/`**: Revoke a specific session or all active sessions.
- **`GET /api/v1/auth/admin/users/`**: Admin endpoint to list and update user roles.

---

## 🧪 4. Testing & Verification

1. **Backend Unit Test Suite**:
   ```bash
   cd backend
   USE_SQLITE=True python3 manage.py test accounts core
   ```
   *Result: `Ran 6 tests in 8.793s OK`*

2. **Frontend Production Compilation**:
   ```bash
   cd frontend
   npm run build
   ```
   *Result: `✓ built in 926ms`*
