# 🛡️ Project TARA - Threat Analysis & Risk Assessment

AI-powered security threat analysis using STRIDE methodology, powered by Google Gemini.

## Features

- **STRIDE-based Analysis**: Automatically identifies threats using the industry-standard STRIDE model
- **Risk Scoring**: Calculates risk scores (Likelihood × Impact) with prioritization
- **Modern UI**: Clean React interface with filtering and visualization
- **Analysis History**: Save and review past security analyses
- **AI-Powered**: Uses Google Gemini for intelligent threat detection

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite
- **AI**: Google Gemini API

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

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

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
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
