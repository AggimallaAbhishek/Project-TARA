# Project TARA - Threat Analysis & Risk Assessment

AI-powered security threat analysis using STRIDE methodology, powered by Ollama (local LLM).

> **Course**: Data Security and Privacy (DS308)
> **Institute**: Indian Institute of Information Technology, Dharwad
> **Faculty**: Dr. Girish Revadigar
> **Students**: Aggimalla Abhishek (23BDS004) · Prem Sagar T K (23BDS065)
> **Year / Semester**: 3rd Year, 6th Semester · Branch: Data Science & AI

---

## Features

- **STRIDE-based Analysis**: Automatically identifies threats using the industry-standard STRIDE model
- **Adaptive Threat Coverage**: Generates as many relevant threats as warranted by architecture complexity
- **Risk Scoring**: Calculates risk scores (Likelihood × Impact) with prioritization
- **Actionable Mitigations**: Returns implementation-oriented mitigation steps per threat
- **Modern UI**: Clean React interface with filtering and visualization
- **Analysis History**: Save and review past security analyses
- **Local AI**: Uses Ollama for private, offline threat detection (no API costs!)
- **Diagram-to-Threat Modeling**: Upload architecture diagrams/DFDs and review extracted architecture text before analysis
- **Document Version Tracking**: Upload PDF/TXT documents and automatically compare issues with the previous version of the same title
- **PDF Report Export**: Download professional PDF reports for each analysis
- **Audit Trail**: Immutable logging of all user actions for compliance

## Tech Stack

- **Backend**: FastAPI (Python 3.12+)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Database**: PostgreSQL 16 (Docker), SQLite (optional fallback)
- **Cache & Rate Limiting**: Redis 7 (optional, with in-memory fallback)
- **AI**: Ollama (local LLM — text + vision models)

---

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores (Intel i5 / AMD Ryzen 5) | 8+ cores (Intel i7 / AMD Ryzen 7 or Apple M-series) |
| **RAM** | 8 GB | 16 GB or more (LLM models are memory-intensive) |
| **Disk Space** | 10 GB free (application + models) | 20+ GB free (for larger models) |
| **GPU** | Not required (CPU inference works) | NVIDIA GPU with 6+ GB VRAM (dramatically faster inference) |
| **Network** | Internet required only for initial setup (downloading models, npm packages, Docker images) | — |

> **Note**: Ollama runs the LLM locally. Smaller models like `llama3.2` (3B) run well on 8 GB RAM. Larger models (7B+) benefit from 16 GB+ RAM or a dedicated GPU.

## Software Requirements

### Required Software

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Git** | 2.30+ | Clone the repository | https://git-scm.com |
| **Docker Desktop** | 4.0+ | Run PostgreSQL, Redis, and app containers | https://www.docker.com/products/docker-desktop |
| **Ollama** | Latest | Run LLM models locally | https://ollama.ai |

### Required Only for Manual (Non-Docker) Setup

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Python** | 3.12+ | Run backend server | https://www.python.org |
| **Node.js** | 18+ (LTS recommended) | Run frontend dev server | https://nodejs.org |
| **npm** | 9+ (bundled with Node.js) | Install frontend dependencies | — |

### Supported Operating Systems

| OS | Status |
|----|--------|
| **macOS** (12 Monterey or later) | ✅ Fully supported |
| **Windows 10/11** (with WSL2 or Docker Desktop) | ✅ Fully supported |
| **Linux** (Ubuntu 22.04+, Fedora 38+) | ✅ Fully supported |

---

## Installation & Demo Setup (Step-by-Step)

Follow these steps to set up and run Project TARA on a fresh PC/laptop.

### Step 1: Install Prerequisites

1. **Install Git**: Download from https://git-scm.com and install.
2. **Install Docker Desktop**: Download from https://www.docker.com/products/docker-desktop and install. Start Docker Desktop and ensure it is running.
3. **Install Ollama**: Download from https://ollama.ai and install.

Verify installations:

```bash
git --version          # Should print git version 2.x+
docker --version       # Should print Docker version 20.x+
docker compose version # Should print Docker Compose version v2.x+
ollama --version       # Should print ollama version 0.x+
```

### Step 2: Download LLM Models

Open a terminal and pull the required Ollama models:

```bash
# Text model for threat analysis (required — ~2 GB download)
ollama pull llama3.2

# Vision model for diagram extraction (optional — ~4 GB download)
ollama pull llava
```

Verify Ollama is running:

```bash
ollama list            # Should show llama3.2 and llava
curl http://localhost:11434/api/tags   # Should return JSON
```

### Step 3: Clone the Repository

```bash
git clone https://github.com/<your-username>/Project-TARA.git
cd Project-TARA
```

### Step 4: Configure Environment

#### Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:

```env
APP_ENV=development
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_VISION_MODEL=llava
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5432/tara
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=replace-with-any-random-string-for-demo
GOOGLE_CLIENT_ID=your-google-client-id
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Google OAuth Setup**: To enable login, create a Google OAuth Client ID at https://console.cloud.google.com/apis/credentials. Add `http://localhost:5173` as an authorised JavaScript origin.

#### Frontend Environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Step 5: Start the Application

You have two options — **Docker (recommended)** or **Manual**.

---

#### Option A: Docker Startup (Recommended — Easiest)

This starts PostgreSQL, Redis, backend, and frontend in Docker containers:

```bash
# One-command startup
./scripts/dev-up.sh
```

Or manually:

```bash
# Start database and cache
docker compose up -d postgres redis

# Build and start backend
docker compose up -d --build backend

# Build and start frontend
docker compose up -d frontend

# Verify everything is running
docker compose ps
curl -fsS http://localhost:8000/health
```

**Access the application:**
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

---

#### Option B: Manual Startup (Without Docker for backend/frontend)

> You still need Docker for PostgreSQL and Redis, or provide your own instances.

**Terminal 1 — Start PostgreSQL & Redis:**

```bash
docker compose up -d postgres redis
```

**Terminal 2 — Start Backend:**

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate          # Windows

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000

**Terminal 3 — Start Frontend:**

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: http://localhost:5173

---

### Step 6: Verify the Setup

1. Open your browser and navigate to **http://localhost:5173** (manual) or **http://localhost** (Docker).
2. You should see the TARA landing page.
3. Click **Login with Google** to authenticate.
4. On the Home page, enter a system description like:

   > A web application with a React frontend, Node.js API server, PostgreSQL database, and Redis cache. Users authenticate via JWT tokens. The API server communicates with a third-party payment gateway.

5. Click **Analyze** and wait for the STRIDE analysis to complete (10–60 seconds).
6. Review the identified threats, risk scores, and mitigations.
7. Click **Export PDF** to download a report.

---

## Running the Demo

### Demo Workflow

1. **Login** → Authenticate with Google OAuth
2. **Text Analysis** → Enter a system architecture description → Click Analyze → View STRIDE threats
3. **Diagram Upload** → Switch to "Upload Diagram" → Upload a PNG/PDF architecture diagram → Extract Architecture → Review text → Analyze
4. **Document Analysis** → Switch to "Upload Document" → Upload a security document (PDF/TXT) → Analyze → View version comparison
5. **History** → Browse past analyses with search and filters
6. **PDF Export** → Open any analysis → Click Export PDF
7. **Compare** → View resolved/unresolved/new issues between document versions

### Sample Input for Demo

```
E-commerce platform with microservices architecture:
- API Gateway (Kong) handling authentication and rate limiting
- User Service managing registration, login, and profile data
- Product Catalog Service with PostgreSQL database
- Order Service processing payments via Stripe API
- Notification Service sending emails via SendGrid
- All services communicate over gRPC with mTLS
- Redis used for session storage and caching
- Deployed on AWS EKS with Kubernetes
- CI/CD pipeline using GitHub Actions
```

---

## Configuration Reference

### Backend (`backend/.env`)

```env
APP_ENV=development
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TEMPERATURE=0.1
OLLAMA_NUM_PREDICT=2048
OLLAMA_NUM_CTX=4096
OLLAMA_REQUEST_TIMEOUT_SECONDS=600
OLLAMA_KEEP_ALIVE=10m
OLLAMA_ENABLE_CACHE=true
OLLAMA_CACHE_TTL_SECONDS=600
OLLAMA_CACHE_MAX_ENTRIES=128
OLLAMA_VISION_MODEL=llava
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5432/tara
# DATABASE_URL=sqlite:///./tara.db
DB_STARTUP_STRICT=false
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOWED_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1)(:\d+)?$
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=your-google-client-id
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=tara@example.com
SMTP_USE_TLS=true
EMAIL_NOTIFICATIONS_ENABLED=false
FRONTEND_URL=http://localhost:5173
DIAGRAM_MAX_UPLOAD_MB=10
DIAGRAM_PDF_MAX_PAGES=3
DIAGRAM_EXTRACT_TTL_SECONDS=1800
DOCUMENT_MAX_UPLOAD_MB=10
DOCUMENT_PDF_MAX_PAGES=20
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_DEBUG_API=false
VITE_API_TIMEOUT_MS=120000
VITE_LONG_TASK_TIMEOUT_MS=600000
```

For Docker backend, Compose sets `OLLAMA_HOST=http://host.docker.internal:11434` by default.
Override it if your Ollama runs on a different host/port:

```bash
OLLAMA_HOST=http://host.docker.internal:11435 ./scripts/dev-up.sh
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Exchange Google credential for JWT |
| GET | `/api/auth/config` | Get auth client configuration |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/analyze` | Create new threat analysis |
| POST | `/api/document/analyze` | Analyze uploaded PDF/TXT document and auto-generate version comparison |
| POST | `/api/diagram/extract` | Extract editable architecture text from uploaded diagram |
| POST | `/api/diagram/analyze` | Analyze extracted (or edited) architecture text |
| GET | `/api/analyses` | List analyses (pagination + search/filter) |
| GET | `/api/analyses/{id}` | Get specific analysis |
| GET | `/api/analyses/{id}/version-comparison` | Compare selected analysis against previous same-title version |
| GET | `/api/analyses/{id}/summary` | Get risk summary |
| GET | `/api/analyses/{id}/export.pdf` | Download analysis report PDF |
| DELETE | `/api/analyses/{id}` | Delete analysis |
| GET | `/api/audit/logs` | List audit events for current user |

## Diagram Upload Workflow

1. Enter an analysis title and switch to **Upload Diagram** mode.
2. Upload one of the supported formats:
   - Images: `png`, `jpg`, `jpeg`
   - PDF: first 3 pages are extracted
   - Text diagrams: Mermaid (`.mmd/.mermaid`), PlantUML (`.puml/.plantuml/.uml`), draw.io XML (`.drawio/.xml`)
3. Click **Extract Architecture** and review/edit extracted text.
4. Click **Analyze Diagram Threats** to run STRIDE analysis.

File uploads are processed ephemerally and not persisted.

## Document Upload Workflow

1. Enter an analysis title and switch to **Upload Document** mode.
2. Upload a supported document (`.pdf` or `.txt`).
3. Click **Analyze Document Threats** to extract text, run STRIDE analysis, and auto-compare with the previous same-title version.
4. Open the analysis detail page to review:
   - Previous issue count
   - Resolved issues
   - Unresolved issues
   - Newly introduced issues

Uploaded source files are processed in-memory only and are not persisted.

## STRIDE Categories

| Letter | Category | Description |
|--------|----------|-------------|
| S | Spoofing | Impersonating something or someone |
| T | Tampering | Modifying data or code |
| R | Repudiation | Denying performed actions |
| I | Information Disclosure | Exposing data to unauthorized users |
| D | Denial of Service | Making system unavailable |
| E | Elevation of Privilege | Gaining unauthorized access |

## Risk Scoring

Risk Score = Likelihood (1-5) × Impact (1-5)

| Score Range | Risk Level |
|-------------|------------|
| 1-4 | Low |
| 5-9 | Medium |
| 10-15 | High |
| 16-25 | Critical |

## Project Structure

```
Project-TARA/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Pydantic settings / env configuration
│   │   ├── database.py          # SQLAlchemy engine & session setup
│   │   ├── models/              # SQLAlchemy ORM models (User, Analysis, Threat, AuditLog)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routes/              # API endpoint routers (auth, analysis, diagram, document, audit)
│   │   ├── services/            # Business logic layer
│   │   │   ├── llm_service.py           # Ollama LLM integration & STRIDE prompting
│   │   │   ├── risk_service.py          # Risk score calculation & prioritization
│   │   │   ├── pdf_service.py           # PDF report generation (ReportLab)
│   │   │   ├── diagram_extract_service.py  # Multi-format diagram extraction
│   │   │   ├── document_extract_service.py # PDF/TXT document text extraction
│   │   │   ├── auth_service.py          # Google OAuth & JWT authentication
│   │   │   ├── rate_limit_service.py    # Hybrid rate limiter (Redis + in-memory)
│   │   │   ├── redis_service.py         # Redis client with graceful fallback
│   │   │   ├── email_service.py         # SMTP email notifications
│   │   │   ├── audit_service.py         # Audit event logging
│   │   │   └── analysis_version_comparison_service.py  # Version diff engine
│   │   └── templates/           # Jinja2 email templates
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Backend container image
│   └── .env.example             # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root React component with routing
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page-level components (Home, Analysis, History, Compare, Login)
│   │   ├── services/            # API client (Axios) and auth config
│   │   ├── context/             # React context (AuthContext)
│   │   └── config/              # Runtime configuration
│   ├── package.json             # Node.js dependencies
│   ├── Dockerfile               # Frontend container image (Vite build → Nginx)
│   └── .env.example             # Environment variable template
├── scripts/
│   └── dev-up.sh                # One-command Docker dev startup
├── docker-compose.yml           # Multi-service container orchestration
└── README.md                    # This file
```

## Troubleshooting

### Backend Won't Start

If you see `Form data requires "python-multipart" to be installed`:

```bash
docker compose up -d --build backend
docker compose ps backend
curl -fsS http://localhost:8000/health
```

### Ollama Connection Errors

```bash
# Check Ollama is running
ollama list

# From Docker environment
docker compose exec -T backend python scripts/check_ollama.py
```

Common fixes:
- Start/restart Ollama on host machine.
- Set `OLLAMA_HOST` so backend can reach Ollama (`http://host.docker.internal:11434` in Docker mode).
- Pull or switch to an installed model (`OLLAMA_MODEL`, `OLLAMA_VISION_MODEL`).

### Port Conflicts

If port `5432` is already occupied:

```bash
POSTGRES_PORT=5433 docker compose up -d postgres
```

Then update `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5433/tara
```

### Document Upload Rejected

- Ensure file type is `.pdf` or `.txt`.
- Ensure file size is under `DOCUMENT_MAX_UPLOAD_MB` (default: 10 MB).
- For PDF files, ensure pages contain selectable text (scanned/image-only PDFs without OCR will fail).

### Windows-Specific Notes

- Use **PowerShell** or **Git Bash** for running commands.
- For Docker, ensure **WSL2 backend** is enabled in Docker Desktop settings.
- Replace `source venv/bin/activate` with `venv\Scripts\activate` for Python virtual environments.

---

## License

MIT
