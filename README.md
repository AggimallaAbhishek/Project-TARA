# Project TARA - Threat Analysis & Risk Assessment

AI-powered security threat analysis using STRIDE methodology, powered by Ollama (local LLM).

## Features

- **STRIDE-based Analysis**: Automatically identifies threats using the industry-standard STRIDE model
- **Risk Scoring**: Calculates risk scores (Likelihood × Impact) with prioritization
- **Modern UI**: Clean React interface with filtering and visualization
- **Analysis History**: Save and review past security analyses
- **Local AI**: Uses Ollama for private, offline threat detection (no API costs!)

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite
- **AI**: Ollama (local LLM)

## Quick Start

### Prerequisites
- [Ollama](https://ollama.ai) installed and running
- A model pulled (e.g., `ollama pull llama3.2` or use cloud models)

### 1. Backend Setup

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

# Run server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000

### 2. Frontend Setup

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
OLLAMA_MODEL=llama3.2
DATABASE_URL=sqlite:///./tara.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GOOGLE_CLIENT_ID=your-google-client-id
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

Configure frontend in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_DEBUG_API=false
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Exchange Google credential for JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/analyze` | Create new threat analysis |
| GET | `/api/analyses` | List all analyses |
| GET | `/api/analyses/{id}` | Get specific analysis |
| GET | `/api/analyses/{id}/summary` | Get risk summary |
| DELETE | `/api/analyses/{id}` | Delete analysis |

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
│   │   ├── database.py      # SQLite setup
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
