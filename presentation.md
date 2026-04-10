---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
---

# Project TARA
## Threat Analysis & Risk Assessment

**Course**: Data Security and Privacy (DS308)
**Institute**: Indian Institute of Information Technology, Dharwad
**Faculty**: Dr. Girish Revadigar

**Team**:
- Aggimalla Abhishek (23BDS004)
- Prem Sagar T K (23BDS065)

---

# The Problem

- **Growth in complexity**: Modern software systems are expanding rapidly, increasing their attack surface.
- **Manual effort**: Traditional threat modeling is slow, manual, and requires extensive domain expertise.
- **Privacy concerns**: Sending architecture descriptions to cloud-based AI compromises proprietary knowledge.
- **Inconsistent tracking**: Hard to track how security posture evolves across different versions of a system.

---

# Introducing Project TARA

An **AI-powered security threat analysis tool** using the industry-standard STRIDE methodology, powered by **Ollama (local LLM)**.

TARA automates the identification, classification, and prioritization of security threats, delivering results in seconds without ever sending data to the cloud.

---

# Key Features (1/2)

- **STRIDE-based Analysis**: Out-of-the-box support for Spoofing, Tampering, Repudiation, Information Disclosure, DoS, and Elevation of Privilege.
- **Local AI Privacy**: Powered entirely by on-device LLMs (e.g., Llama 3) — no API costs, zero data leaving the network.
- **Multi-Modal Input**: 
  - Text system descriptions
  - Architecture Diagrams (Images, PDFs)
  - Code-based diagrams (Mermaid, PlantUML)

---

# Key Features (2/2)

- **Document Version Tracking**: Upload new versions of PDFs/TxTs to automatically track resolved vs. new security issues.
- **Risk Scoring**: Quantitative scoring (Likelihood × Impact) prioritizing critical threats.
- **Actionable Mitigations**: Returns targeted, implementation-oriented mitigation steps.
- **Professional Exports**: Generate beautiful PDF reports instantly.

---

# System Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  ┌─────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │  Landing &  │ │   Home &   │ │  Analysis  │ │  Compare &     │  │
│  │  Login Page │ │  Input Form│ │  Detail    │ │  History       │  │
│  └──────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘  │
│         └──────────────┴──────────────┴─────────────────┘           │
│                              │ HTTP/REST                             │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Service Layer)                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────┐   │  │
│  │  │ LLM Service│ │Risk Service│ │ PDF Service │ │Email Svc  │   │  │
│  │  ├────────────┤ ├────────────┤ ├─────────────┤ ├───────────┤   │  │
│  │  │Auth Service│ │Audit Svc   │ │Rate Limiter │ │Redis Svc  │   │  │
│  │  ├────────────┤ ├────────────┤ ├─────────────┤ ├───────────┤   │  │
│  │  │Diagram Ext.│ │Document Ext│ │Comparison   │ │Extract Sn │   │  │
│  │  └────────────┘ └────────────┘ └─────────────┘ └───────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────┬────────────────────────────────┬───────────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────┐           ┌─────────────────────┐
│   PostgreSQL 16      │           │    Ollama (LLM)     │
│   (Primary DB)       │           │  - Text Model       │
│   Redis 7            │           │  - Vision Model     │
│   (Cache + Rate Lim) │           │  Runs on Host       │
└──────────────────────┘           └─────────────────────┘
```

---

# Technology Stack

**Backend**
- Python 3.12+ with **FastAPI**
- **Ollama** for Local LLM (text and vision models)

**Frontend**
- **React 19** with Vite
- Tailwind CSS

**Databases & Infrastructure**
- **PostgreSQL** for persistent data storage
- **Redis** for caching and rate limiting
- Fully containerized with **Docker**

---

# How It Works: Workflows

**1. Text Workflow**:
User describes architecture → TARA parses → AI runs STRIDE → Risk sorted.

**2. Diagram Workflow**:
User uploads PNG/PDF/Mermaid → Vision model extracts architecture to text → AI runs STRIDE.

**3. Document Workflow**:
User uploads security PDF → PyMuPDF extracts text → AI runs STRIDE → TARA compares against previous runs for historical diffs.

---

# The STRIDE Model

| Letter | Category | Threat Example |
|--------|----------|----------------|
| **S** | Spoofing | Impersonating an admin user |
| **T** | Tampering | Modifying database records |
| **R** | Repudiation | Denying an executed transaction |
| **I** | Info Disclosure | Exposing PII via logging |
| **D** | Denial of Service | Flooding the API gateway |
| **E** | Elevation of Privilege| Gaining root access |

---

# Risk Scoring Mechanism

Quantitative Risk Assessment ensures teams know what to fix first. 

*Risk Score = Likelihood (1-5) × Impact (1-5)*

| Score Range | Risk Level | Action required |
|-------------|------------|-----------------|
| 1-4 | **Low** | Monitor |
| 5-9 | **Medium** | Plan for next sprint |
| 10-15 | **High** | Fix promptly |
| 16-25 | **Critical** | Immediate attention |

---

# Summary & Impact

- **Extremely Fast**: Brings threat assessment time down from days to seconds.
- **Cost Effective & Private**: Zero API calls means no LLM token costs and strict data sovereignty.
- **Shift-Left Security**: Allows developers to find architectural flaws before writing a single line of code.

### Thank You!
**Project TARA** — Securing software architectures intelligently.
