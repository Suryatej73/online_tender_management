# tenderX - Online Tender Management System

> **Module 1 (M1): Project Setup (Docker, Git, CI/CD, Django + React Init)**

---

## 🚀 Overview

**tenderX** is an enterprise-grade Online Tender Management System designed to handle end-to-end procurement workflows, bidding, evaluation, reverse auctions, vendor management, and audit tracking.

Module 1 establishes the full-stack containerized infrastructure, repository configuration, caching, task queuing, and continuous integration pipeline.

---

## 🛠️ Stack Architecture

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | SPA UI shell, Lucide icons, glassmorphism design system |
| **Backend** | Django 4.2 REST Framework | Python 3.11, REST API server, CORS headers |
| **Database** | PostgreSQL 15 | Relational persistence database |
| **Cache Layer** | Redis 7 | In-memory key-value cache and message broker |
| **Task Queue** | Celery 5 | Asynchronous background worker process |
| **Containers** | Docker & Docker Compose | Multi-container environment orchestration |
| **CI/CD** | GitHub Actions | Automated workflow for linting, tests, and builds |

---

## 📁 Repository Structure

```
tenderX/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD pipeline
├── backend/                       # Django Backend App
│   ├── core/                      # Core health check & task endpoints
│   ├── tenderx_backend/           # Django settings, Celery config, ASGI/WSGI
│   ├── Dockerfile                 # Python 3.11 slim container
│   ├── requirements.txt           # Python dependencies
│   └── manage.py
├── frontend/                      # React Frontend App
│   ├── src/
│   │   ├── components/            # SystemStatus dashboard component
│   │   ├── App.jsx                # Main interface & roadmap
│   │   ├── index.css              # Custom styling design system
│   │   └── main.jsx
│   ├── Dockerfile                 # Node 20 slim container
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml             # Orchestration for db, redis, backend, celery, frontend
├── .env.example                   # Environment configuration template
├── .env                           # Local environment config
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start with Docker Compose

1. **Clone the Repository & Navigate to Directory**:
   ```bash
   cd tenderX
   ```

2. **Copy Environment File**:
   ```bash
   cp .env.example .env
   ```

3. **Launch Infrastructure Containers**:
   ```bash
   docker compose up --build -d
   ```

4. **Access Applications**:
   - **Frontend UI**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8000/api/v1/health/`
   - **Django Admin**: `http://localhost:8000/admin/`

---

## 💻 Local Development Setup (Without Docker)

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py test
python manage.py runserver
```

The backend uses SQLite by default for local VS Code development. Docker Compose
explicitly switches to PostgreSQL. If port 8000 is already in use, stop the
existing Django terminal with `Ctrl+C`, or run `python manage.py runserver 8001`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Windows PowerShell notes

If PowerShell reports that `npm.ps1` cannot be loaded because script execution is
disabled, use the Windows command shim instead:

```powershell
npm.cmd install
npm.cmd run dev
```

The Docker commands above require Docker Desktop to be installed and running.
If `docker` is not recognized, install Docker Desktop (or add its CLI to your
`PATH`) before using Docker Compose.

---

## 🔌 Module 1 API Endpoints

- **`GET /api/v1/health/`**: Returns system health status across Django, PostgreSQL, Redis, and Celery.
- **`POST /api/v1/tasks/trigger/`**: Dispatches a sample background Celery task to verify queue execution.

---

## 🗺️ 12-Module Project Roadmap

- [x] **M1: Project Setup** (Docker, Git, CI/CD, Django + React Init) — [*Docs*](docs/M1_PROJECT_SETUP.md)
- [x] **M2: User Authentication & Role-Based Access Control (RBAC)** — [*Docs*](docs/M2_AUTH_AND_RBAC.md)
- [x] **M3: Advanced User Management & Authentication UI** — [*Docs*](docs/M3_USER_MANAGEMENT_AND_AUTH_UI.md)
- [x] **M5: Complete Tender Management Engine (State Machine, Categories, Templates, Amendments, Versioning)** — [*Docs*](docs/M5_TENDER_MANAGEMENT.md)
- [x] **M6: Vendor Management (Registration, Verification, Profiles, Ratings, Performance, Blacklisting)** — [*Docs*](docs/M6_VENDOR_MANAGEMENT.md)
- [ ] **M7: Encrypted Bid Submission Engine**
- [ ] **M8: Automated & Manual Tender Evaluation**
- [ ] **M9: Real-time Reverse Auction Engine**
- [ ] **M10: Award of Contract & PO Generation**
- [ ] **M11: Payment Gateway & EMD Wallet Integration**
- [ ] **M12: Analytics, Spend Reports & Vendor Performance**


