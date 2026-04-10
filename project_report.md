# Project TARA — Threat Analysis & Risk Assessment

## A Comprehensive Project Report

---

| | |
|---|---|
| **Project Title** | TARA — Threat Analysis & Risk Assessment |
| **Domain** | Cybersecurity / Artificial Intelligence |
| **Technology Stack** | FastAPI · React · PostgreSQL · Redis · Ollama (Local LLM) |
| **Version** | 1.0.0 |

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Literature Survey](#5-literature-survey)
6. [System Architecture](#6-system-architecture)
7. [Technology Stack](#7-technology-stack)
8. [Module Description](#8-module-description)
9. [Database Design](#9-database-design)
10. [API Specification](#10-api-specification)
11. [Security Implementation](#11-security-implementation)
12. [User Interface](#12-user-interface)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Testing Strategy](#14-testing-strategy)
15. [Results & Discussion](#15-results--discussion)
16. [Future Enhancements](#16-future-enhancements)
17. [Conclusion](#17-conclusion)
18. [References](#18-references)

---

## 1. Abstract

**Project TARA (Threat Analysis & Risk Assessment)** is an AI-powered web application that automates the identification, classification, and prioritisation of security threats in software architectures using the industry-standard **STRIDE** threat-modelling methodology. Unlike traditional manual threat-modelling approaches — which are time-consuming, error-prone, and require deep domain expertise — TARA leverages a locally hosted Large Language Model (LLM) via **Ollama** to analyse system descriptions, architecture diagrams, and security documents, producing structured threat reports with actionable mitigation strategies.

The system is designed as a full-stack web application with a **FastAPI** backend and a **React** frontend. It supports multiple input modalities including free-text system descriptions, architecture diagram uploads (PNG, JPEG, PDF, Mermaid, PlantUML, draw.io XML), and document uploads (PDF, TXT). A key differentiator is its **document version tracking** capability, which automatically compares new analyses against previous versions to surface resolved, unresolved, and newly introduced security issues.

All AI processing is performed locally using Ollama, ensuring **complete data privacy** — no sensitive architectural information leaves the organisation's network, and there are no recurring API costs associated with cloud LLM providers.

---

## 2. Introduction

As modern software systems grow increasingly complex — spanning microservices, cloud-native architectures, and distributed data pipelines — the attack surface expands correspondingly. Threat modelling has emerged as a critical practice in the Secure Development Lifecycle (SDL) to proactively identify and remediate security vulnerabilities before they are exploited.

The **STRIDE** model, developed by Microsoft, provides a systematic framework for threat identification by categorising threats into six types:

| Letter | Category | Description |
|--------|----------|-------------|
| **S** | Spoofing | Impersonating something or someone else |
| **T** | Tampering | Modifying data or code without authorisation |
| **R** | Repudiation | Denying having performed an action |
| **I** | Information Disclosure | Exposing data to unauthorised users |
| **D** | Denial of Service | Making the system unavailable to legitimate users |
| **E** | Elevation of Privilege | Gaining unauthorised access to higher-privilege resources |

TARA automates this analysis by combining LLM-based natural language understanding with structured risk scoring, delivering results in seconds rather than the hours or days required by manual analysis.

---

## 3. Problem Statement

Traditional threat modelling faces several critical challenges:

1. **Manual Effort**: Identifying threats across complex architectures requires extensive manual review by security experts, often taking days per system.
2. **Expertise Dependency**: Effective threat modelling requires deep knowledge of both security and the specific system architecture, creating a bottleneck.
3. **Inconsistency**: Manual analyses are subjective and vary significantly between analysts.
4. **Lack of Version Tracking**: As systems evolve, there is no automated mechanism to track how the threat landscape changes between architecture versions.
5. **Cost**: Cloud-based AI solutions often require sending sensitive architectural data to third-party APIs, raising data privacy and cost concerns.

TARA addresses these challenges by providing an automated, consistent, private, and cost-effective threat analysis solution.

---

## 4. Objectives

The primary objectives of Project TARA are:

1. **Automated Threat Identification**: Leverage AI to automatically identify security threats in software architectures using STRIDE methodology.
2. **Multi-Modal Input Support**: Accept system descriptions as text, architecture diagrams (multiple formats), and security documents.
3. **Quantitative Risk Scoring**: Calculate risk scores using `Likelihood × Impact` matrices for objective threat prioritisation.
4. **Actionable Mitigations**: Generate numbered, implementation-oriented mitigation steps for each identified threat.
5. **Version Comparison**: Automatically track and compare threat evolution across document versions.
6. **Data Privacy**: Ensure all AI processing remains local using Ollama — no data leaves the network.
7. **PDF Report Export**: Generate professional, structured PDF reports for stakeholder communication.
8. **Audit Trail**: Maintain a complete audit log of all user actions for accountability and compliance.

---

## 5. Literature Survey

| Topic | Key Insight | Reference |
|-------|-------------|-----------|
| STRIDE Threat Model | Systematic categorisation of threats into six categories for comprehensive coverage | Microsoft SDL (Shostack, 2014) |
| LLM for Security Analysis | Large Language Models can identify security vulnerabilities with accuracy comparable to junior analysts | OWASP AI Security Guidelines |
| Ollama Local LLM Hosting | Self-hosted LLM inference eliminates data privacy concerns and API costs | Ollama Project Documentation |
| Risk Scoring Matrices | Likelihood × Impact provides a quantitative, repeatable risk assessment framework | NIST SP 800-30 |
| Automated Threat Modelling | Automation reduces analysis time from days to minutes while maintaining consistency | IriusRisk, Microsoft Threat Modeling Tool |

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  ┌─────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │  Landing &   │ │   Home &   │ │  Analysis  │ │  Compare &     │  │
│  │  Login Page  │ │  Input Form│ │  Detail    │ │  History       │  │
│  └──────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘  │
│         └──────────────┴──────────────┴─────────────────┘           │
│                              │ HTTP/REST                             │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                                 │
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │   Auth    │ │  Analysis │ │  Diagram   │ │    Document        │ │
│  │  Router   │ │  Router   │ │  Router    │ │    Router          │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬──────┘ └────────┬───────────┘ │
│        └──────────────┴─────────────┴─────────────────┘             │
│                              │                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     SERVICE LAYER                              │ │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │ LLM Service│ │Risk Service│ │ PDF Service  │ │Email Svc  │ │ │
│  │  ├────────────┤ ├────────────┤ ├─────────────┤ ├───────────┤ │ │
│  │  │Auth Service│ │Audit Svc   │ │Rate Limiter │ │Redis Svc  │ │ │
│  │  ├────────────┤ ├────────────┤ ├─────────────┤ ├───────────┤ │ │
│  │  │Diagram Ext.│ │Document Ext│ │Comparison   │ │Extract Sn │ │ │
│  │  └────────────┘ └────────────┘ └─────────────┘ └───────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────┬────────────────────────────────┬───────────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────┐           ┌─────────────────────┐
│   PostgreSQL 16      │           │    Ollama (LLM)     │
│   (Primary DB)       │           │  - Text Model       │
│                      │           │  - Vision Model     │
│   Redis 7            │           │                     │
│   (Cache + Rate Lim) │           │  Runs on Host       │
└──────────────────────┘           └─────────────────────┘
```

### 6.2 Application Lifecycle

The application employs a **lifespan-based startup** pattern using FastAPI's `asynccontextmanager`. During startup:

1. Database tables are created via SQLAlchemy ORM (`Base.metadata.create_all`).
2. Startup operates in either **fail-fast** (production) or **degraded** (development) mode based on `DB_STARTUP_STRICT`.
3. Redis connectivity is established with graceful fallback to in-memory caches.
4. Production safety checks enforce `SECRET_KEY` configuration.

### 6.3 Request Flow

```
User Action → React UI → Axios HTTP Client → FastAPI Router
    → Authentication Middleware (JWT / Cookie)
    → Rate Limiter (Redis / In-Memory)
    → Service Layer → Ollama LLM / Database
    → Response Serialisation (Pydantic) → JSON Response
```

---

## 7. Technology Stack

### 7.1 Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Python** | Primary language | 3.12+ |
| **FastAPI** | Web framework with OpenAPI support | ≥ 0.109.0 |
| **Uvicorn** | ASGI server with hot-reload | ≥ 0.27.0 |
| **SQLAlchemy** | ORM and database abstraction | ≥ 2.0.0 |
| **Pydantic** | Data validation and serialisation | ≥ 2.0.0 |
| **Ollama** | Local LLM inference client | ≥ 0.4.0 |
| **ReportLab** | PDF report generation | ≥ 4.0.0 |
| **PyMuPDF (fitz)** | PDF text and image extraction | ≥ 1.24.0 |
| **Redis** | Caching, rate limiting | ≥ 5.0.0 |
| **python-jose** | JWT token operations | ≥ 3.3.0 |
| **google-auth** | Google OAuth2 token verification | ≥ 2.0.0 |
| **aiosmtplib** | Async email notifications | ≥ 3.0.0 |
| **Jinja2** | Email HTML templates | ≥ 3.1.0 |
| **Psycopg2** | PostgreSQL driver | ≥ 2.9.0 |
| **Alembic** | Database migration management | ≥ 1.13.0 |

### 7.2 Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI component library | 19.2.4 |
| **Vite** | Build tool and dev server | 8.0.4 |
| **Tailwind CSS** | Utility-first CSS framework | 3.4.19 |
| **React Router** | Client-side routing | 7.14.0 |
| **Axios** | HTTP client for API calls | 1.14.0 |
| **Framer Motion** | Animation library | 12.38.0 |
| **Recharts** | Data visualisation (charts) | 3.8.1 |
| **Lucide React** | Icon library | 1.7.0 |
| **@react-oauth/google** | Google OAuth login | 0.13.4 |

### 7.3 Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerisation of all services |
| **Docker Compose** | Multi-container orchestration |
| **PostgreSQL 16** | Primary relational database |
| **Redis 7** | Caching and distributed rate limiting |
| **Nginx** | Production static file serving & reverse proxy |
| **Ollama** | Self-hosted LLM inference engine |

---

## 8. Module Description

### 8.1 Authentication Module (`auth_service.py`)

Implements **Google OAuth 2.0** based authentication with **JWT** session management.

**Key Features:**
- Google ID token verification via `google-auth` library with issuer validation.
- JWT access token generation with configurable expiry (default: 24 hours).
- Dual token delivery: HTTP-only cookie (`tara_access_token`) and Bearer header.
- Automatic user provisioning on first login (`get_or_create_user`).
- CSRF protection via `SameSite=Lax` cookies combined with CORS origin restrictions.

### 8.2 LLM Service Module (`llm_service.py`)

The core AI module that interfaces with Ollama for STRIDE-based threat analysis.

**Key Features:**
- **Adaptive Threat Generation**: Dynamically estimates target threat count (6–18) based on input complexity (character length).
- **Structured Prompting**: Uses a carefully crafted STRIDE prompt requiring JSON-only output with specific fields (name, description, stride_category, affected_component, risk_level, likelihood, impact, mitigation).
- **Retry Logic**: Two-phase attempt strategy — first without forced JSON mode, then with `format=json` and expanded `num_predict`.
- **Response Parsing**: Multi-strategy JSON extraction (direct parse → regex array extraction → wrapped object extraction).
- **Mitigation Normalisation**: Robust parsing of mitigation steps from various LLM output formats (numbered lists, bullet points, serialised arrays, semicolon-separated).
- **Hybrid Caching** (`HybridThreatCache`): Redis-first with in-memory LRU fallback. Cache keys are SHA-256 hashes of normalised descriptions.
- **Timeout Protection**: Configurable per-request timeout (default: 600s) with descriptive error messages.

### 8.3 Diagram Extraction Module (`diagram_extract_service.py`)

Extracts architecture descriptions from uploaded diagrams for subsequent threat analysis.

**Supported Formats:**

| Format | Extraction Method |
|--------|-------------------|
| PNG, JPEG images | Ollama Vision model (e.g., LLaVA) |
| PDF documents | Page-to-image conversion via PyMuPDF → Vision model |
| Mermaid (`.mmd`) | Regex-based parser for components, flows, and subgraphs |
| PlantUML (`.puml`) | Keyword-based parser for actors, components, databases, edges |
| draw.io XML (`.drawio`) | XML DOM parser for mxCell vertices and edges |

**Output**: Structured text with sections for Components, Data Flows, Trust Boundaries, and External Systems.

### 8.4 Document Analysis Module (`document_extract_service.py`)

Handles document uploads for security document analysis with version tracking.

**Key Features:**
- Text extraction from PDF (via PyMuPDF page-level text extraction) and TXT files.
- Content-type validation and file magic-byte verification.
- Configurable page limits (`DOCUMENT_PDF_MAX_PAGES`, default: 20).
- Extracted text normalisation and truncation to 5,000 characters.

### 8.5 Version Comparison Module (`analysis_version_comparison_service.py`)

Automatically compares threat analyses across document versions.

**Algorithm:**
1. Build a **threat signature** from `(name, stride_category, affected_component)` — normalised and lowercased.
2. Locate the **previous version** by matching title (case-insensitive) for the same user, ordered by creation date.
3. Compute set differences to classify threats as:
   - **Resolved**: Present in previous version but absent in current.
   - **Unresolved**: Present in both versions.
   - **New**: Present in current version but absent in previous.

### 8.6 Risk Scoring Module (`risk_service.py`)

Implements quantitative risk assessment using a **Likelihood × Impact** matrix.

**Risk Score Calculation:**
```
Risk Score = Likelihood (1–5) × Impact (1–5)
```

| Score Range | Risk Level | Action Priority |
|-------------|------------|-----------------|
| 1–4 | Low | Monitor |
| 5–9 | Medium | Plan remediation |
| 10–15 | High | Prioritise fix |
| 16–25 | Critical | Immediate action |

**Aggregation**: Weighted average across all threats in an analysis. Threats are sorted by risk score for prioritised viewing.

### 8.7 PDF Report Module (`pdf_service.py`)

Generates professional PDF reports using the **ReportLab** library.

**Report Contents:**
- Report header with title, ID, creation date, and risk summary.
- System description section.
- Threat summary table (sortable by risk score) with colour-coded headers.
- Detailed threat cards with description, STRIDE category, risk level, component, and mitigation steps.
- Sanitised mitigation text with normalised numbering.

### 8.8 Rate Limiting Module (`rate_limit_service.py`)

Implements a **Hybrid Rate Limiter** with Redis-first and in-memory fallback.

**Configuration:**

| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| `/api/analyze` | 5 | 60 seconds |
| `/api/diagram/extract` | 10 | 60 seconds |
| `/api/diagram/analyze` | 5 | 60 seconds |
| `/api/document/analyze` | 5 | 60 seconds |

**Redis Strategy**: Sliding-window using sorted sets (`ZADD`, `ZRANGEBYSCORE`, `ZCARD`) with atomic pipeline execution.

### 8.9 Email Notification Module (`email_service.py`)

Sends analysis completion notifications via SMTP.

**Features:**
- Async email delivery via `aiosmtplib`.
- HTML email templates rendered with Jinja2.
- Configurable SMTP settings (host, port, TLS, credentials).
- Graceful degradation when SMTP is unavailable.

### 8.10 Audit Logging Module (`audit_service.py`)

Records all significant user actions for compliance and accountability.

**Tracked Events:**
- `analysis_created` — with threat count, risk score, and analysis time.
- `analysis_deleted` — with title, threat count, and risk score.

---

## 9. Database Design

### 9.1 Entity-Relationship Diagram

```
┌──────────────┐       1:N       ┌──────────────┐       1:N       ┌──────────────┐
│    users     │───────────────→│   analyses   │───────────────→│   threats    │
├──────────────┤                 ├──────────────┤                 ├──────────────┤
│ id (PK)      │                 │ id (PK)      │                 │ id (PK)      │
│ email (UQ)   │                 │ user_id (FK) │                 │ analysis_id  │
│ name         │                 │ title        │                 │   (FK)       │
│ picture      │                 │ system_desc  │                 │ name         │
│ google_id(UQ)│                 │ created_at   │                 │ description  │
│ created_at   │                 │ updated_at   │                 │ stride_cat.  │
│ last_login   │                 │ total_risk   │                 │ affected_comp│
└──────┬───────┘                 │ analysis_time│                 │ risk_level   │
       │                         └──────────────┘                 │ likelihood   │
       │     1:N                                                  │ impact       │
       │           ┌──────────────┐                               │ risk_score   │
       └──────────→│  audit_logs  │                               │ mitigation   │
                   ├──────────────┤                               │ created_at   │
                   │ id (PK)      │                               └──────────────┘
                   │ user_id (FK) │
                   │ analysis_id  │
                   │   (FK, null) │
                   │ action       │
                   │ event_meta   │
                   │   (JSON)     │
                   │ created_at   │
                   └──────────────┘
```

### 9.2 Table Descriptions

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Stores authenticated user profiles | `email` (unique), `google_id` (unique), `name`, `picture` |
| `analyses` | Stores threat analysis sessions | `title`, `system_description`, `total_risk_score`, `analysis_time` |
| `threats` | Individual threats linked to an analysis | `stride_category`, `risk_level`, `likelihood`, `impact`, `risk_score`, `mitigation` |
| `audit_logs` | Immutable audit trail of user actions | `action`, `event_metadata` (JSON), `created_at` |

### 9.3 Database Configuration

- **Primary**: PostgreSQL 16 (Docker) with connection pooling (`pool_size=5`, `max_overflow=10`, `pool_pre_ping=True`).
- **Fallback**: SQLite for lightweight local development (via `check_same_thread=False`).
- Auto-creation of tables at startup via SQLAlchemy `create_all`.

---

## 10. API Specification

### 10.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/google` | Exchange Google OAuth credential for a JWT access token |
| `GET` | `/api/auth/config` | Retrieve auth configuration (Google Client ID) |
| `GET` | `/api/auth/me` | Get current authenticated user profile |

### 10.2 Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Submit a system description for STRIDE threat analysis |
| `GET` | `/api/analyses` | List analyses with pagination, search, and filters (risk level, STRIDE category, date range) |
| `GET` | `/api/analyses/{id}` | Retrieve a specific analysis with all identified threats |
| `GET` | `/api/analyses/{id}/summary` | Get aggregated risk summary with STRIDE distribution |
| `GET` | `/api/analyses/{id}/version-comparison` | Compare analysis against previous same-title version |
| `GET` | `/api/analyses/{id}/export.pdf` | Download the analysis as a formatted PDF report |
| `DELETE` | `/api/analyses/{id}` | Delete an analysis and its associated threats |

### 10.3 Diagram Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/diagram/extract` | Upload a diagram and extract editable architecture text |
| `POST` | `/api/diagram/analyze` | Submit extracted/edited architecture text for STRIDE analysis |

### 10.4 Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/document/analyze` | Upload a PDF/TXT document for analysis with automatic version comparison |

### 10.5 Audit & System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit/logs` | List audit events for the current user |
| `GET` | `/health` | Application health check (DB + Redis status) |

---

## 11. Security Implementation

### 11.1 Authentication & Authorisation

- **OAuth 2.0**: Google Sign-In with server-side ID token verification (issuer, audience, and required-field checks).
- **JWT Sessions**: HS256-signed tokens with configurable expiry. Delivered via HTTP-only `SameSite=Lax` cookies for CSRF resistance.
- **Resource Isolation**: All database queries are scoped to `current_user.id` — users cannot access another user's analyses.

### 11.2 Input Validation

- **Pydantic Schemas**: All API inputs are validated through strict Pydantic v2 schemas.
- **File Validation**: Magic-byte verification for PDF (`%PDF`) and images (PNG header, JPEG `\xff\xd8`).
- **Content-Type Checks**: MIME type validation against expected file formats.
- **Size Limits**: Configurable maximum upload sizes for diagrams (`DIAGRAM_MAX_UPLOAD_MB`) and documents (`DOCUMENT_MAX_UPLOAD_MB`).

### 11.3 Rate Limiting

- Hybrid Redis + in-memory sliding-window rate limiting.
- Per-user rate limits on expensive endpoints (analysis, diagram extraction).
- `Retry-After` header included in 429 responses.

### 11.4 CORS Policy

- Explicit origin allowlisting (`ALLOWED_ORIGINS`) for production.
- Regex-based pattern matching for development convenience.
- Credentials mode enabled with restricted HTTP methods and headers.

### 11.5 Production Safety

- Startup crash if `SECRET_KEY` equals the default placeholder in production mode.
- Database startup in fail-fast mode for production, degraded mode for development.
- Sensitive health-check details gated behind authentication.

### 11.6 Data Privacy

- **Local LLM Processing**: All AI inference runs on-premises via Ollama — no data is sent to external APIs.
- **Ephemeral File Processing**: Uploaded diagrams and documents are processed in-memory only and are not persisted to disk.

---

## 12. User Interface

### 12.1 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing Page** | `/welcome` | Public marketing/introductory page |
| **Login Page** | `/login` | Google OAuth sign-in with animated UI |
| **Home Page** | `/` | Main analysis dashboard with input form (text, diagram, or document upload) |
| **Analysis Detail** | `/analysis/:id` | Full threat report with filtering, STRIDE badges, risk badges, and PDF export |
| **History** | `/history` | Paginated list of past analyses with search and filters |
| **Compare** | `/compare` | Version comparison view showing resolved, unresolved, and new issues |
| **404** | `*` | Custom not-found page |

### 12.2 Key UI Components

| Component | Purpose |
|-----------|---------|
| `Navbar` | Navigation with auth state, user avatar, and responsive menu |
| `SystemInputForm` | Multi-mode input form (text / diagram / document upload) |
| `ThreatCard` | Detailed threat display with expandable mitigation steps |
| `ThreatTable` | Sortable table view of threats |
| `RiskBadge` | Colour-coded risk level indicator (Low/Medium/High/Critical) |
| `StrideBadge` | STRIDE category badge with icon |
| `RiskSummary` | Aggregated risk statistics with Recharts visualisation |
| `LoadingSpinner` | Animated loading state with contextual message |
| `ProtectedRoute` | Route guard redirecting unauthenticated users to login |
| `AppErrorBoundary` | Global error boundary with recovery UI |

### 12.3 Design System

- **Dark Theme**: Cybersecurity-themed dark UI with `bg-dark-primary` and `bg-cyber-pattern` backdrop.
- **Animations**: Framer Motion page transitions with `AnimatePresence`.
- **Responsive**: Mobile-first layout with Tailwind CSS breakpoints (`sm`, `md`, `lg`).
- **Typography**: Clean sans-serif font stack with `font-display` for headings.

---

## 13. Deployment & DevOps

### 13.1 Docker Architecture

The application is fully containerised using Docker Compose with four services:

```yaml
services:
  postgres:    # PostgreSQL 16 Alpine — data persistence
  redis:       # Redis 7 Alpine — caching & rate limiting
  backend:     # FastAPI application container
  frontend:    # Vite build → Nginx static server
```

### 13.2 Service Dependencies

```
frontend → backend → postgres
                   → redis
backend  → ollama (host machine)
```

### 13.3 Development Startup

```bash
# Canonical one-command startup
./scripts/dev-up.sh

# Manual equivalent
docker compose up -d postgres redis
docker compose up -d --build backend
docker compose up -d frontend
curl -fsS http://localhost:8000/health
```

### 13.4 Health Checks

| Service | Method | Interval |
|---------|--------|----------|
| PostgreSQL | `pg_isready -U tara` | 5s |
| Redis | `redis-cli ping` | 5s |
| Backend | `HTTP GET /health` | 10s |
| Frontend | Depends on backend healthy | — |

### 13.5 Port Mapping

| Service | Container Port | Host Port |
|---------|---------------|-----------|
| PostgreSQL | 5432 | `${POSTGRES_PORT:-5432}` |
| Redis | 6379 | 6379 |
| Backend | 8000 | 8000 |
| Frontend | 80 | 80 |

---

## 14. Testing Strategy

### 14.1 Backend Testing

- **Framework**: pytest (Python).
- **Unit Tests**: Service-layer tests for LLM response parsing, risk scoring, rate limiting, and mitigation normalisation.
- **Integration Tests**: API endpoint tests with database fixtures using SQLAlchemy test sessions.
- **Cache Tests**: Verification of hybrid cache hit/miss behaviour and TTL expiry.

### 14.2 Frontend Testing

- **Framework**: Vitest + React Testing Library + jsdom.
- **Component Tests**: Isolated tests for `AppErrorBoundary`, `Navbar`, `ThreatCard`, `LoginPage`, `HistoryPage`, `HomePage`, `AnalysisPage`, `ComparePage`.
- **Service Tests**: API error handling and auth configuration resolution.
- **Commands**:
  ```bash
  cd frontend
  npm run test       # Watch mode
  npm run test:run   # Single run (CI)
  ```

---

## 15. Results & Discussion

### 15.1 Key Achievements

1. **Automated STRIDE analysis** producing 6–18 structured threats per system description, with processing times typically under 60 seconds for local models.
2. **Multi-format diagram support** enabling threat modelling directly from architecture diagrams without manual transcription.
3. **Version tracking** providing visibility into how threat posture evolves across document revisions — a capability not commonly found in existing tools.
4. **Zero external API dependency** for AI processing, ensuring complete data sovereignty.
5. **Hybrid caching architecture** (Redis + in-memory) ensuring responsive performance even without Redis.
6. **Professional PDF export** with structured layout, risk tables, and detailed mitigation steps for stakeholder reporting.

### 15.2 Performance Characteristics

| Metric | Typical Value |
|--------|---------------|
| Analysis time (local LLM) | 10–60 seconds |
| Cache hit response time | < 100ms |
| PDF generation time | < 2 seconds |
| Diagram extraction (text-based) | < 500ms |
| Diagram extraction (vision model) | 15–45 seconds |

### 15.3 Limitations

1. **LLM Quality Dependency**: Threat quality varies with model capability — larger models produce more nuanced analysis but require more compute.
2. **No Real-Time Collaboration**: Currently single-user per analysis session.
3. **English Only**: STRIDE prompts and analysis are optimised for English-language system descriptions.

---

## 16. Future Enhancements

1. **MITRE ATT&CK Mapping**: Map identified threats to MITRE ATT&CK techniques for richer context.
2. **Collaborative Analysis**: Multi-user sessions with real-time threat annotation.
3. **CI/CD Integration**: GitHub Actions / GitLab CI pipeline triggers for automated threat analysis on architecture document changes.
4. **Custom Threat Libraries**: Organisation-specific threat databases for domain-tailored analysis.
5. **Dashboard Analytics**: Aggregate risk trends over time across all analyses.
6. **Cloud LLM Fallback**: Optional integration with cloud providers (OpenAI, Anthropic) for users who prefer managed inference.
7. **Multilingual Support**: Extend analysis capabilities to non-English system descriptions.
8. **RBAC**: Role-based access control for team-level permissions (Viewer, Analyst, Admin).

---

## 17. Conclusion

Project TARA successfully demonstrates the application of local Large Language Models to automate the traditionally labour-intensive process of threat modelling. By combining the STRIDE methodology with AI-powered analysis, the system delivers consistent, quantitative, and actionable security assessments in seconds.

The architecture — built on FastAPI, React, PostgreSQL, Redis, and Ollama — provides a modern, scalable, and privacy-respecting platform. Key innovations include multi-modal input support (text, diagrams, documents), automatic version comparison for tracking threat evolution, and a hybrid caching strategy for responsive performance.

The project validates that effective threat modelling need not require expensive cloud APIs or deep security expertise for initial assessment. TARA empowers development teams to incorporate security analysis early in the development lifecycle, aligning with shift-left security practices and reducing the cost of vulnerability remediation.

---

## 18. References

1. Shostack, A. (2014). *Threat Modeling: Designing for Security*. Wiley.
2. Microsoft. (2009). *The STRIDE Threat Model*. Microsoft Security Development Lifecycle.
3. NIST. (2012). *SP 800-30 Rev. 1: Guide for Conducting Risk Assessments*. National Institute of Standards and Technology.
4. OWASP. (2023). *OWASP Top 10 for LLM Applications*. Open Web Application Security Project.
5. Ollama Project. (2024). *Ollama Documentation*. https://ollama.ai
6. FastAPI. (2024). *FastAPI Official Documentation*. https://fastapi.tiangolo.com
7. React. (2024). *React Official Documentation*. https://react.dev
8. SQLAlchemy. (2024). *SQLAlchemy ORM Documentation*. https://docs.sqlalchemy.org
9. Docker. (2024). *Docker Compose Documentation*. https://docs.docker.com/compose
10. ReportLab. (2024). *ReportLab User Guide*. https://docs.reportlab.com

---

*Report prepared for academic evaluation. All source code is available in the project repository.*
