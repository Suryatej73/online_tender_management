# Module 1 (M1): Project Infrastructure Documentation
**Project**: tenderX - Online Tender Management System  
**Module**: M1 - Project Setup (Docker, Git, CI/CD, Django + React Init)  
**Repository**: [online_tender_management](https://github.com/Suryatej73/online_tender_management.git)

---

## 📄 1. Module Overview & Purpose

Module 1 establishes the enterprise-grade foundation for **tenderX**. It provides a scalable, containerized, multi-service architecture designed to support end-to-end procurement, encrypted bidding, automated evaluations, live reverse auctions, and audit trails.

---

## 🏗️ 2. Architecture Blueprint

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|                       http://localhost:5173 (React 18 + Vite)                     |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTP / REST API
                                          v
+-----------------------------------------------------------------------------------+
|                                 DJANGO REST BACKEND                               |
|                            http://localhost:8000 (Python 3.11)                    |
+-----------------------------------------------------------------------------------+
             |                                              |
             | Database ORM Connection                      | Cache & Broker Connection
             v                                              v
+--------------------------+                      +---------------------------------+
|   POSTGRESQL DATABASE    |                      |        REDIS CACHE & BROKER     |
|   localhost:5432 (v15)   |                      |        localhost:6379 (v7)      |
+--------------------------+                      +---------------------------------+
                                                            |
                                                            | Task Dispatch
                                                            v
                                                  +---------------------------------+
                                                  |       CELERY TASK WORKER        |
                                                  |       Background Process        |
                                                  +---------------------------------+
```

---

## 📂 3. Complete Directory Structure

```
tenderX/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD pipeline definition
├── backend/                       # Django Backend Root
│   ├── core/                      # Core app for health checks & system tasks
│   │   ├── __init__.py
│   │   ├── apps.py                # Core app config
│   │   ├── tasks.py               # Asynchronous Celery background tasks
│   │   ├── tests.py               # Django unit tests for M1
│   │   ├── urls.py                # API routing (/api/v1/health/, /api/v1/tasks/trigger/)
│   │   └── views.py               # REST API View classes with DRF / fallback
│   ├── tenderx_backend/           # Django project configuration module
│   │   ├── __init__.py            # Exports Celery app
│   │   ├── asgi.py                # ASGI entrypoint for WebSockets
│   │   ├── celery.py              # Celery app initialization
│   │   ├── settings.py            # Settings for Postgres, Redis, Celery, CORS
│   │   ├── urls.py                # Root URL router
│   │   └── wsgi.py                # WSGI entrypoint for web servers
│   ├── Dockerfile                 # Python 3.11 container manifest
│   ├── manage.py                  # Django management script
│   └── requirements.txt           # Python dependencies list
├── docs/
│   └── M1_PROJECT_SETUP.md        # Comprehensive Module 1 documentation
├── frontend/                      # React Frontend Root
│   ├── src/
│   │   ├── components/
│   │   │   └── SystemStatus.jsx   # Interactive status dashboard component
│   │   ├── App.jsx                # Main interface & 12-Module roadmap
│   │   ├── index.css              # Glassmorphism dark design system
│   │   └── main.jsx               # React DOM entrypoint
│   ├── Dockerfile                 # Node 20 slim container manifest
│   ├── index.html                 # Main HTML document with Google Fonts
│   ├── package.json               # Node packages & scripts
│   └── vite.config.js             # Vite bundler & API proxy configuration
├── .env.example                   # Environment configuration template
├── .env                           # Active environment settings
├── .gitignore                     # Version control exclusion rules
├── docker-compose.yml             # Service orchestration manifest
└── README.md                      # Quick-start project documentation
```

---

## ⚙️ 4. Technical Specifications of Components

### 4.1 PostgreSQL Database (`db`)
- **Image**: `postgres:15-alpine`
- **Port**: `5432:5432`
- **Volume**: `postgres_data` (data persistence)
- **Role**: Primary data store for user roles, tender documents, encrypted bids, evaluation scores, and audit logs.

### 4.2 Redis Cache & Message Broker (`redis`)
- **Image**: `redis:7-alpine`
- **Port**: `6379:6379`
- **Volume**: `redis_data`
- **Role**: In-memory caching layer (Database 1) and Celery message transport broker (Database 0).

### 4.3 Django REST Backend (`backend`)
- **Framework**: Django 4.2 + Django REST Framework
- **Runtime**: Python 3.11 Slim
- **Port**: `8000:8000`
- **Role**: Serves REST API endpoints, handles business logic, security authentication, and ORM database interaction.

### 4.4 Celery Task Queue (`celery_worker`)
- **Framework**: Celery 5.3
- **Command**: `celery -A tenderx_backend worker -l info`
- **Role**: Handles asynchronous tasks (email notifications, document processing, reverse auction timers, bid encryption tasks).

### 4.5 React Frontend (`frontend`)
- **Framework**: React 18 + Vite 5
- **Port**: `5173:5173`
- **Design Token**: Modern dark mode glassmorphism, responsive grid layout, pulse status indicators.
- **Role**: Client interface providing real-time system monitoring, tender creation forms, vendor bidding dashboards.

### 4.6 CI/CD Pipeline (`.github/workflows/ci.yml`)
- **Provider**: GitHub Actions
- **Triggers**: Pushes and Pull Requests to `main`, `master`, or `develop`.
- **Jobs**:
  1. `backend-test`: Runs Django unit test suite (`python manage.py test`).
  2. `frontend-build`: Installs node dependencies and verifies production compilation (`npm run build`).
  3. `docker-validate`: Validates `docker-compose.yml` configuration.

---

## 🔌 5. API Endpoint Reference

### 5.1 System Health Check API
- **Endpoint**: `GET /api/v1/health/`
- **Response Status**: `200 OK`
- **Response Format**:
```json
{
  "project": "tenderX - Online Tender Management System",
  "module": "M1 - Project Setup (Docker, Git, CI/CD, Django + React)",
  "system_status": "OPERATIONAL",
  "timestamp": "2026-08-13T10:20:00.000000",
  "services": {
    "django": {
      "status": "online",
      "details": "Django 4.2 REST API Server"
    },
    "postgresql": {
      "status": "online",
      "details": "Connected to Database"
    },
    "redis": {
      "status": "online",
      "details": "Connected to Redis Cache"
    },
    "celery": {
      "status": "online",
      "details": "Celery task dispatched (Task ID: ...)"
    }
  }
}
```

### 5.2 Trigger Asynchronous Task API
- **Endpoint**: `POST /api/v1/tasks/trigger/`
- **Response Status**: `202 Accepted`
- **Response Format**:
```json
{
  "message": "Celery background task dispatched!",
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## 🚀 6. How to Run & Verify Module 1

### Method A: Running with Docker Compose (Recommended)
```bash
# Clone repository
git clone https://github.com/Suryatej73/online_tender_management.git
cd online_tender_management

# Start all containers in background
docker compose up --build -d

# Check running services
docker compose ps
```
- Access Frontend UI: `http://localhost:5173`
- Access Backend API Health: `http://localhost:8000/api/v1/health/`

### Method B: Running Django Tests Locally
```bash
cd backend
USE_SQLITE=True python3 manage.py test
```
*Output: `Ran 1 test in 0.004s OK`*

### Method C: Running Frontend Production Build Locally
```bash
cd frontend
npm install
npm run build
```
*Output: `✓ built in 784ms`*

---

## 🗺️ 7. Roadmap to Next Modules

- [x] **M1: Project Setup (Completed)**
- [ ] **M2: User Authentication & Role-Based Access Control (RBAC)**
- [ ] **M3: Tender Creation & BOQ Specifications**
- [ ] **M4: Encrypted Bid Submission Engine**
- [ ] **M5: Automated & Manual Tender Evaluation**
- [ ] **M6: Real-time Reverse Auction Engine**
- [ ] **M7: Award of Contract & PO Generation**
- [ ] **M8: Payment Gateway & EMD Wallet**
- [ ] **M9: Immutable Audit Logging & Security**
- [ ] **M10: Notifications & WebSockets**
- [ ] **M11: Spend Analytics & Vendor Reports**
- [ ] **M12: Production Hardening & Ops**
