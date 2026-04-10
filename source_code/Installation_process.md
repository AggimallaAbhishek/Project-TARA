# Project TARA — Installation & Setup Guide

> **Complete step-by-step guide to install, configure, and run Project TARA on a fresh PC/laptop.**

---

## Table of Contents

1. [Hardware Requirements](#1-hardware-requirements)
2. [Software Requirements](#2-software-requirements)
3. [Step 1 — Install Prerequisites](#step-1--install-prerequisites)
4. [Step 2 — Download AI Models](#step-2--download-ai-models)
5. [Step 3 — Extract the Source Code](#step-3--extract-the-source-code)
6. [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
7. [Step 5 — Start the Application](#step-5--start-the-application)
8. [Step 6 — Verify the Setup](#step-6--verify-the-setup)
9. [Running the Demo](#running-the-demo)
10. [Stopping the Application](#stopping-the-application)
11. [Troubleshooting](#troubleshooting)
12. [Platform-Specific Notes](#platform-specific-notes)

---

## 1. Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Processor** | 4 cores (Intel i5 / AMD Ryzen 5) | 8+ cores (Intel i7 / AMD Ryzen 7 / Apple M-series) |
| **RAM** | 8 GB | 16 GB or more |
| **Free Disk Space** | 10 GB | 20+ GB |
| **GPU** | Not required (CPU inference works) | NVIDIA GPU with 6+ GB VRAM (faster AI inference) |
| **Internet** | Required for initial setup only | — |

> **Why so much RAM?** Ollama loads AI models entirely into memory. The default `llama3.2` model (3B parameters) needs ~4 GB RAM. Larger models need more.

---

## 2. Software Requirements

### Must Install (All Platforms)

| # | Software | Minimum Version | What It Does | Download Link |
|---|----------|----------------|--------------|---------------|
| 1 | **Docker Desktop** | 4.0+ | Run database, cache, and app containers | https://www.docker.com/products/docker-desktop |
| 2 | **Ollama** | Latest | Run AI models locally on your machine | https://ollama.ai/download |

### Only Needed for Manual (Non-Docker) Backend/Frontend

| # | Software | Minimum Version | What It Does | Download Link |
|---|----------|----------------|--------------|---------------|
| 4 | **Python** | 3.12+ | Run the backend API server | https://www.python.org/downloads |
| 5 | **Node.js** | 18+ (LTS) | Run the frontend development server | https://nodejs.org |

### Supported Operating Systems

- ✅ **macOS** 12 Monterey or later
- ✅ **Windows 10/11** (with Docker Desktop + WSL2 backend enabled)
- ✅ **Linux** (Ubuntu 22.04+, Fedora 38+, or equivalent)

---

## Step 1 — Install Prerequisites

### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git (usually pre-installed on macOS)
git --version

# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
# Open the .dmg file and drag Docker to Applications
# Launch Docker Desktop from Applications

# Install Ollama
# Download from: https://ollama.ai/download
# Open the .dmg file and follow installation steps
```

### Windows

1. **Git**: Download and run the installer from https://git-scm.com/downloads. Use default options.
2. **Docker Desktop**: Download from https://www.docker.com/products/docker-desktop.
   - During installation, ensure **"Use WSL 2 instead of Hyper-V"** is checked.
   - After install, open Docker Desktop and wait for it to fully start.
3. **Ollama**: Download from https://ollama.ai/download and run the installer.

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Git
sudo apt install -y git

# Install Docker
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and log back in for group changes to take effect

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

### Verify All Installations

Open a **new terminal** and run:

```bash
docker --version
# Expected: Docker version 2x.x.x

docker compose version
# Expected: Docker Compose version v2.x.x

ollama --version
# Expected: ollama version 0.x.x
```

✅ All three commands should succeed before proceeding.

---

## Step 2 — Download AI Models

Ollama needs to download the AI models before first use. This is a **one-time download**.

### Required: Text Model (for threat analysis)

```bash
ollama pull llama3.2
```

- **Download size**: ~2 GB
- **What it does**: Analyses system descriptions and generates STRIDE threats

### Optional: Vision Model (for diagram extraction)

```bash
ollama pull llava
```

- **Download size**: ~4 GB
- **What it does**: Reads architecture diagrams (PNG, JPEG, PDF) and extracts text descriptions

### Verify Models Are Ready

```bash
ollama list
```

Expected output:

```
NAME           ID           SIZE    MODIFIED
llama3.2       a80c4f17acd5 2.0 GB  Just now
llava          8dd30f6b0cb1 4.7 GB  Just now
```

### Verify Ollama API Is Running

```bash
curl http://localhost:11434/api/tags
```

This should return a JSON response listing your models. If it fails, start Ollama:

```bash
# macOS/Windows: Open the Ollama app from your Applications
# Linux:
ollama serve
```

---

## Step 3 — Extract the Source Code

1. You should have received a `source_code.zip` file.
2. Extract (unzip) it to any location on your computer.

**macOS / Linux:**
```bash
# Navigate to where you saved the zip file
cd ~/Downloads    # or wherever the zip is located

# Unzip
unzip source_code.zip

# Enter the project directory
cd source_code
```

**Windows:**
- Right-click `source_code.zip` → **Extract All** → Choose a folder → **Extract**
- Open the extracted `source_code` folder

Verify the project structure:

```bash
ls -la
# You should see: backend/  frontend/  docker-compose.yml  scripts/  README.md
```

---

## Step 4 — Configure Environment Variables

### 4.1 Backend Configuration

```bash
# Copy the example environment file
cp backend/.env.example backend/.env
```

Open `backend/.env` in any text editor and set the following values:

```env
# ── Core Settings ──
APP_ENV=development

# ── Ollama (AI Model) ──
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_VISION_MODEL=llava

# ── Database ──
DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5432/tara

# ── Redis Cache ──
REDIS_URL=redis://localhost:6379/0

# ── Authentication ──
GOOGLE_CLIENT_ID=your-google-client-id
SECRET_KEY=any-random-string-for-demo-use

# ── CORS (allowed frontend URLs) ──
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> **Google OAuth Client ID**: To enable Google login:
> 1. Go to https://console.cloud.google.com/apis/credentials
> 2. Create a new **OAuth 2.0 Client ID** (Web application type)
> 3. Add `http://localhost:5173` as an **Authorized JavaScript origin**
> 4. Copy the Client ID and paste it as `GOOGLE_CLIENT_ID`

### 4.2 Frontend Configuration

```bash
# Copy the example environment file
cp frontend/.env.example frontend/.env
```

Open `frontend/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

> Use the **same** Google Client ID in both backend and frontend `.env` files.

---

## Step 5 — Start the Application

Choose **one** of the two options below.

### Option A: Docker Startup (Recommended — Easiest)

This starts everything (database, cache, backend, frontend) in Docker containers.

```bash
# From the source_code root directory:
./scripts/dev-up.sh
```

**Or run manually step-by-step:**

```bash
# 1. Start PostgreSQL and Redis
docker compose up -d postgres redis

# 2. Wait for database to be ready (5–10 seconds)
docker compose ps postgres
# STATUS should show "healthy"

# 3. Build and start the backend
docker compose up -d --build backend

# 4. Wait for backend to be ready (10–15 seconds)
docker compose ps backend
# STATUS should show "healthy"

# 5. Build and start the frontend
docker compose up -d frontend

# 6. Verify all services are running
docker compose ps
```

Expected output:

```
NAME         SERVICE     STATUS
postgres     postgres    Up (healthy)
redis        redis       Up (healthy)
backend      backend     Up (healthy)
frontend     frontend    Up
```

**Access the application at:**

| Service | URL |
|---------|-----|
| **Frontend (App)** | http://localhost |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

---

### Option B: Manual Startup (3 Terminals)

Use this if you want to run backend/frontend outside Docker (e.g., for development).

> **Note**: You still need Docker for PostgreSQL and Redis.

#### Terminal 1 — Database & Cache

```bash
cd source_code
docker compose up -d postgres redis

# Verify they're healthy
docker compose ps
```

#### Terminal 2 — Backend (Python)

```bash
cd source_code/backend

# Create a Python virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows (PowerShell)
# venv\Scripts\activate.bat       # Windows (CMD)

# Install all Python dependencies
pip install -r requirements.txt

# Start the backend server with hot-reload
uvicorn app.main:app --reload
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     DB init success
```

#### Terminal 3 — Frontend (Node.js)

```bash
cd source_code/frontend

# Install JavaScript dependencies
npm install

# Start the frontend development server
npm run dev
```

You should see:

```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

**Access the application at:**

| Service | URL |
|---------|-----|
| **Frontend (App)** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |

---

## Step 6 — Verify the Setup

### Quick Health Check

```bash
# Backend health
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# Ollama connectivity
curl http://localhost:11434/api/tags
# Expected: JSON with model list
```

### Full Walkthrough

1. Open **http://localhost:5173** (manual) or **http://localhost** (Docker) in your browser.
2. You should see the **TARA landing page** with a dark cybersecurity-themed UI.
3. Click **Login with Google** and authenticate with your Google account.
4. You are now on the **Home page** — the main analysis dashboard.
5. Enter a system description in the text area (see sample below).
6. Click **Analyze** — the AI will process the input (10–60 seconds).
7. View the **STRIDE threat analysis** results with risk scores and mitigations.

✅ If you see threat results, the setup is complete!

---

## Running the Demo

### Step-by-Step Demo Flow

| Step | Action | What Happens |
|------|--------|-------------|
| 1 | **Login** | Authenticate via Google OAuth |
| 2 | **Text Analysis** | Type a system description → Click Analyze → View STRIDE threats |
| 3 | **Diagram Upload** | Switch to "Upload Diagram" → Upload a PNG/PDF → Extract Architecture → Analyze |
| 4 | **Document Analysis** | Switch to "Upload Document" → Upload a PDF/TXT → Analyze → View version comparison |
| 5 | **View History** | Navigate to History page → Search and filter past analyses |
| 6 | **Export PDF** | Open any analysis → Click Export PDF → Download report |
| 7 | **Compare Versions** | Upload the same document title again → View resolved/unresolved/new issues |

### Sample Input for Demo

Copy and paste this into the text input area:

```
E-commerce platform with microservices architecture:
- API Gateway (Kong) handling authentication and rate limiting
- User Service managing registration, login, and profile data in PostgreSQL
- Product Catalog Service with search powered by Elasticsearch
- Order Service processing payments via Stripe API
- Notification Service sending emails via SendGrid
- All services communicate over gRPC with mTLS
- Redis used for session storage and caching
- File uploads stored in AWS S3
- Deployed on AWS EKS with Kubernetes
- CI/CD pipeline using GitHub Actions
- Monitoring via Prometheus and Grafana
```

This input should generate **10–18 STRIDE threats** covering spoofing, tampering, data exposure, denial of service, and privilege escalation scenarios.

---

## Stopping the Application

### Docker Setup

```bash
# Stop all services (preserves data)
docker compose down

# Stop and delete all data (clean slate)
docker compose down -v
```

### Manual Setup

- **Backend**: Press `Ctrl+C` in Terminal 2
- **Frontend**: Press `Ctrl+C` in Terminal 3
- **Database/Cache**: `docker compose down` in Terminal 1

---

## Troubleshooting

### ❌ "Cannot connect to the Docker daemon"

**Cause**: Docker Desktop is not running.

**Fix**: Open Docker Desktop and wait for it to fully start (the whale icon in the taskbar/menu bar should be steady, not animating).

---

### ❌ Backend shows "Ollama is unreachable"

**Cause**: Ollama is not running or not reachable.

**Fix**:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If it fails, start Ollama:
# macOS/Windows: Open the Ollama app
# Linux: ollama serve

# If using Docker, the backend needs host.docker.internal:
# Check OLLAMA_HOST in docker-compose.yml
```

---

### ❌ "Model 'llama3.2' is unavailable"

**Cause**: The AI model hasn't been downloaded yet.

**Fix**:

```bash
ollama pull llama3.2
ollama pull llava    # optional, for diagram uploads
ollama list          # verify models are listed
```

---

### ❌ Port 5432 already in use

**Cause**: Another PostgreSQL instance is using port 5432.

**Fix**:

```bash
# Start Docker Postgres on a different port
POSTGRES_PORT=5433 docker compose up -d postgres

# Update backend/.env
# DATABASE_URL=postgresql+psycopg2://tara:tara@localhost:5433/tara
```

---

### ❌ "Form data requires python-multipart to be installed"

**Cause**: Stale Docker image without latest dependencies.

**Fix**:

```bash
docker compose up -d --build backend
```

---

### ❌ Google Login not working

**Cause**: Google Client ID is not configured or origin is not authorised.

**Fix**:

1. Verify `GOOGLE_CLIENT_ID` is set in both `backend/.env` and `frontend/.env`.
2. In Google Cloud Console, ensure `http://localhost:5173` is listed as an **Authorized JavaScript origin**.
3. Restart both backend and frontend after making changes.

---

### ❌ Analysis takes too long / times out

**Cause**: The AI model is too large for your hardware.

**Fix**:

- Use a smaller model: `ollama pull llama3.2` (3B params) instead of larger variants.
- Update `OLLAMA_MODEL=llama3.2` in `backend/.env`.
- Increase timeout: `OLLAMA_REQUEST_TIMEOUT_SECONDS=900` in `backend/.env`.

---

### ❌ Document upload rejected

**Cause**: File type or size not supported.

**Fix**:

- Only `.pdf` and `.txt` files are supported.
- Maximum file size is 10 MB (configurable via `DOCUMENT_MAX_UPLOAD_MB`).
- PDF files must contain selectable text (scanned/image-only PDFs will fail).

---

## Platform-Specific Notes

### Windows

- Use **PowerShell** or **Git Bash** (installed with Git) for all commands.
- Activate Python virtual environments with `venv\Scripts\activate` instead of `source venv/bin/activate`.
- Ensure **WSL2** backend is enabled in Docker Desktop → Settings → General.
- If `./scripts/dev-up.sh` doesn't work, use `bash scripts/dev-up.sh` or run the manual Docker commands.

### macOS (Apple Silicon — M1/M2/M3/M4)

- Ollama runs natively on Apple Silicon with excellent performance.
- Docker Desktop must be the **Apple Silicon** version (not Rosetta).
- Models run on the unified memory — no separate GPU needed.

### Linux

- Add your user to the `docker` group to avoid `sudo`: `sudo usermod -aG docker $USER`
- Run `ollama serve` in the background or set it up as a systemd service.
- If using a firewall, ensure ports 5173, 8000, 5432, 6379, and 11434 are open for localhost.

---

*For questions or issues, refer to the main [README.md](./README.md) or the [project_report.md](./project_report.md).*
