# Project TARA - Threat Analysis & Risk Assessment

AI-powered security threat analysis using STRIDE methodology, powered by Ollama (local LLM).

## Features

- **STRIDE-based Analysis**: Automatically identifies threats using the industry-standard STRIDE model
- **Adaptive Threat Coverage**: Generates as many relevant threats as warranted by architecture complexity
- **Risk Scoring**: Calculates risk scores (Likelihood × Impact) with prioritization
- **Actionable Mitigations**: Returns implementation-oriented mitigation steps per threat
- **Modern UI**: Clean React interface with filtering and visualization
- **Analysis History**: Save and review past security analyses
- **Local AI**: Uses Ollama for private, offline threat detection (no API costs!)
- **Diagram-to-Threat Modeling**: Upload architecture diagrams/DFDs and review extracted architecture text before analysis

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL (Docker for local default), SQLite (optional fallback)
- **AI**: Ollama (local LLM)

## Quick Start

### Prerequisites
- [Ollama](https://ollama.ai) installed and running
- A text model pulled (e.g., `ollama pull llama3.2`)
- A vision model pulled for diagram extraction (e.g., `ollama pull llava`)
- Ollama API reachable from backend runtime at `OLLAMA_HOST` (default local host: `http://127.0.0.1:11434`)

### 1. Docker Dev Startup (Recommended)

Run from repository root:

```bash
./scripts/dev-up.sh
```

This is the canonical local startup path. It rebuilds backend (`--build`), starts services, and verifies backend readiness via `/health`.

Manual equivalent:

```bash
docker compose up -d postgres redis
docker compose up -d --build backend
docker compose up -d frontend
docker compose ps backend
curl -fsS http://localhost:8000/health
```

### 2. Backend Setup (Local Python runtime)

```bash
cd backend

# Create virtual environment (use Python 3.12 if available)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your secrets and model preferences

# Start PostgreSQL first (from repo root in a separate terminal)
# cd ..
# docker compose up -d postgres

# Verify DB connectivity deterministically before app startup
python scripts/check_db.py

# Run server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs at: http://localhost:5173

## Configuration

Configure backend in `backend/.env`:

```env
APP_ENV=development
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TEMPERATURE=0.1
OLLAMA_NUM_PREDICT=768
OLLAMA_NUM_CTX=4096
OLLAMA_REQUEST_TIMEOUT_SECONDS=120
OLLAMA_KEEP_ALIVE=10m
OLLAMA_ENABLE_CACHE=true
OLLAMA_CACHE_TTL_SECONDS=600
OLLAMA_CACHE_MAX_ENTRIES=128
OLLAMA_VISION_MODEL=llava
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5432/tara
# DATABASE_URL=sqlite:///./tara.db
# Optional override: false in development, true in production when unset
DB_STARTUP_STRICT=false
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOWED_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1)(:\d+)?$
GOOGLE_CLIENT_ID=your-google-client-id
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DIAGRAM_MAX_UPLOAD_MB=10
DIAGRAM_PDF_MAX_PAGES=3
DIAGRAM_EXTRACT_TTL_SECONDS=1800
```

For Docker backend, Compose sets `OLLAMA_HOST=http://host.docker.internal:11434` by default.
Override it if your Ollama runs on a different host/port:

```bash
OLLAMA_HOST=http://host.docker.internal:11435 ./scripts/dev-up.sh
```

### Local PostgreSQL Notes

Start and health-check Postgres before running backend:

```bash
docker compose up -d postgres
docker compose ps postgres
docker compose exec postgres pg_isready -U tara -d tara
cd backend
venv/bin/python scripts/check_db.py
```

If host port `5432` is occupied by a native local Postgres, run Docker Postgres on `5433` instead:

```bash
POSTGRES_PORT=5433 docker compose up -d postgres
```

Then update backend `DATABASE_URL` to:

```env
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5433/tara
```

### Troubleshooting

If backend fails during startup with:

```text
Form data requires "python-multipart" to be installed
```

this usually means a stale backend image is running without latest dependencies. Rebuild backend image and restart:

```bash
docker compose up -d --build backend
docker compose ps backend
curl -fsS http://localhost:8000/health
```

If analysis requests fail with Ollama connectivity or model errors, verify from backend runtime:

```bash
docker compose exec -T backend python scripts/check_ollama.py
```

Common fixes:
- Start/restart Ollama on host machine.
- Set `OLLAMA_HOST` so backend can reach Ollama (`http://host.docker.internal:11434` in Docker mode).
- Pull or switch to an installed model (`OLLAMA_MODEL`, `OLLAMA_VISION_MODEL`).

### PDF Branding Assets

To include your branding in exported PDFs, place these files in `backend/app/assets/pdf/`:

- `banner.png` (shown at the top of page 1 only)
- `logo.png` (shown below the banner on page 1 only)

Supported branding image formats for lookup are `.png`, `.jpg`, `.jpeg` with base names `banner` and `logo`.

Configure frontend in `frontend/.env`:

```env
# Required
VITE_API_BASE_URL=http://localhost:8000/api

# Optional (frontend env takes precedence; backend /api/auth/config is fallback)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_DEBUG_API=false
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Exchange Google credential for JWT |
| GET | `/api/auth/config` | Get auth client configuration |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/analyze` | Create new threat analysis |
| POST | `/api/diagram/extract` | Extract editable architecture text from uploaded diagram |
| POST | `/api/diagram/analyze` | Analyze extracted (or edited) architecture text |
| GET | `/api/analyses` | List analyses (pagination + search/filter) |
| GET | `/api/analyses/{id}` | Get specific analysis |
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
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy engine/session setup
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routes/          # API endpoints
│   │   └── services/        # LLM & risk services
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   ├── pages/           # Page components
    │   └── services/        # API client
    └── package.json
```

## License

MIT
