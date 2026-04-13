# Project TARA - Video Presentation Script

## 1. Introduction (0:00 - 0:30)
**Visual:** Title Slide: "Project TARA - Threat Analysis & Risk Assessment". Show the names of the creators (Aggimalla Abhishek & Prem Sagar T K).
**Audio (Voiceover):** "Welcome to our presentation of Project TARA, an AI-powered security threat analysis tool built for modern system architectures. Traditional threat modeling can be tedious, but TARA automates this process using the industry-standard STRIDE methodology. Best of all, it's powered entirely by local AI using Ollama, which means zero API costs and 100% data privacy."

## 2. Overview & Architecture (0:30 - 1:00)
**Visual:** Screen recording showing the clean React UI landing page. Then, a quick graphic/text overlay of the tech stack: React frontend, FastAPI backend, PostgreSQL, and Ollama LLM.
**Audio:** "Under the hood, TARA is built with a fast React frontend, a robust Python FastAPI backend, and PostgreSQL for data storage. It seamlessly integrates with Ollama's local language and vision models, like Llama 3.2 and LLaVA, to perform deep analysis on architecture descriptions, diagrams, and security documents."

## 3. Demo Workflow 1: Text-based Analysis (1:00 - 1:45)
**Visual:** Screen recording of a user logging in via Google OAuth. User navigates to the Home page, types a system description into the Text Analysis form, and clicks "Analyze".
**Audio:** "Let's dive into the platform. Once users securely log in with Google, they enter the dashboard. Here, you can simply type or paste a description of your system architecture. Once you click analyze, our local LLM evaluates the system against the six pillars of STRIDE: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege."
**Visual:** The screen quickly shows the analysis result page loading.
**Audio:** "Within seconds, TARA generates a comprehensive list of threats, assigns a risk score based on likelihood and impact, and provides actionable mitigation steps to secure your system."

## 4. Demo Workflow 2: Architecture Diagram & Document Analysis (1:45 - 2:30)
**Visual:** Switch to the "Upload Diagram" tab. User uploads a PNG/PDF architecture diagram. TARA extracts the text. Then click "Analyze Diagram Threats".
**Audio:** "But what if you already have an architecture diagram? No problem. By switching to the Diagram Upload mode, you can upload image or PDF diagrams. TARA uses an integrated vision model to extract structural details and automatically analyze them."
**Visual:** Switch to "Upload Document" tab. Upload a PDF security document. Show the previous version comparison feature with resolved/unresolved issues.
**Audio:** "TARA also supports document analysis. If you upload a newer version of an existing security document, TARA intelligently compares it with the previous version—highlighting newly introduced issues, as well as tracking which threats have been resolved or still remain."

## 5. Exports, History, and Compliance (2:30 - 3:00)
**Visual:** User navigates to the "History" tab, searches for an analysis, opens it, and clicks "Export PDF". Opens the professional PDF report.
**Audio:** "Accountability and tracking are built right in. Every user action is recorded in an immutable audit log for compliance. You can browse past analyses through your history, and with a single click, generate professional PDF reports that you can hand off to your engineering and security teams."

## 6. Setup & Conclusion (3:00 - 3:15)
**Visual:** Quick terminal shot showing `./scripts/dev-up.sh` booting up Docker containers and Ollama. Return to the main dashboard.
**Audio:** "Getting TARA running is simple. With Docker and Ollama, a single script spins up the entire environment locally. Project TARA is secure, private, and makes intelligent threat modeling accessible. Thank you for watching!"
