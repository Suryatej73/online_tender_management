# tenderX — System Modules Directory

Welcome to the technical module specifications for the **tenderX Online Tender Management System**.

tenderX is organized into 10 cohesive engineering modules spanning frontend presentation, REST API services, transactional PostgreSQL schemas, cryptographic sealing, and security compliance.

---

## 📚 Complete Module Index

| Module ID | Module Title | Primary Capabilities & Architectural Scope | Documentation Link |
| :--- | :--- | :--- | :--- |
| **M1** | **Project Infrastructure & Setup** | Multi-container Docker Compose microservices, Django 6 + Vite React init, CI/CD pipeline | [M1 Documentation](../M1_PROJECT_SETUP.md) |
| **M2** | **Authentication, Security & RBAC** | Stateless JWT authentication, 6-role RBAC hierarchy, TOTP MFA / 2FA, session rotation | [M2 Documentation](../M2_AUTH_AND_RBAC.md) |
| **M3** | **Advanced User Management UI** | Split-screen login/signup, administrative user dashboard, granular permission matrix editor | [M3 Documentation](../M3_USER_MANAGEMENT_AND_AUTH_UI.md) |
| **M4** | **Tender Creation & BOQ Specifications** | Tender drafting, category catalog, Bill of Quantities (BOQ) itemization, template system | [M4 Documentation](../M4_TENDER_MANAGEMENT.md) |
| **M5** | **Tender State Machine Engine** | Finite state machine (`DRAFT` → `PUBLISHED` → `ACTIVE` → `EVALUATION` → `AWARDED` → `CLOSED`), amendment versioning | [M5 Documentation](../M5_TENDER_MANAGEMENT.md) |
| **M6** | **Vendor 360 & Pre-qualification** | Vendor onboarding, KYC / GST / PAN compliance, rating & review system, sanctions & blacklisting | [M6 Documentation](../M6_VENDOR_MANAGEMENT.md) |
| **M7** | **Dual-Envelope Sealed Bidding** | Isolated Technical & Financial envelopes, SHA-256 integrity hashing, two-stage authorized opening | [M7 Documentation](../M7_BID_SUBMISSION_AND_SECURE_BIDDING.md) |
| **M8** | **Document Vault & Storage Intelligence**| Secure cloud/local storage, SHA-256 checksums, malware scanning pipeline, immutable versions | [M8 Documentation](../M8_DOCUMENT_MANAGEMENT.md) |
| **M9** | **Bid Evaluation & Scoring Matrix** | Dual-dossier document inspection, numerical scoring (0–100), evaluator committee oversight panel | [M9 Documentation](../M9_EVALUATION_AND_SCORING.md) |
| **M10**| **Contract Award & Platform Governance** | Winner declaration & badges, automated email dispatch, dispute resolution, immutable `PlatformAuditLog` | [M10 Documentation](../M10_CONTRACT_AWARD_AND_GOVERNANCE.md) |

---

## 🏛️ System-Wide Requirements & Specifications
- **Software Requirements Specification (SRS)**: Complete IEEE 830 / ISO 29148 compliant technical specification with UML Use Case, Class, Sequence, State, and ER Diagrams: [SRS.md](../SRS.md).
