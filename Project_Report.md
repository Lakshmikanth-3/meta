# DeadlineEnv: Comprehensive Project Report & Documentation

## 1. Project Overview
**DeadlineEnv** is a state-of-the-art AI-powered security code review platform designed for high-pressure production environments. It serves two primary roles:
1.  **A Premium Developer Tool**: A glassmorphism-based web dashboard where engineers can audit code via GitHub URLs or direct snippets.
2.  **An RL-Ready Environment**: A fully compliant **OpenEnv** reinforcement learning environment used to train and evaluate AI agents on their ability to detect security vulnerabilities and logic bugs.

---

## 2. Architecture & Components

### 2.1 Backend (Python / FastAPI)
The core engine of DeadlineEnv resides in the `/backend` directory.
- **API Server**: Built with FastAPI, it exposes endpoints for environment interaction (`/reset`, `/step`, `/state`) and direct inference (`/infer`).
- **RL Environment**: Implemented in `deadline_environment.py`, it manages the state of a code review session, including file diffs, ground-truth bugs, and reward calculation.
- **Corpus**: A curated dataset of security vulnerabilities categorized by difficulty (Easy, Medium, Hard), located in `server/corpus/`.
- **LLM Grader**: A "real implementation" judge that uses an LLM to evaluate the quality of agent feedback, replacing primitive keyword heuristics.

### 2.2 Frontend (Next.js / Tailwind CSS)
A cinematic, high-performance dashboard located in `/frontend`.
- **Playground View**: Allows real-time scanning of code with an animated "line-by-line" scanner effect.
- **GitHub Integration**: Dynamically fetches files from public repositories using the GitHub REST API.
- **Security Scoreboard**: Visualizes the AI's findings using severity badges (Critical, Warning, Nit) and a cumulative health score.
- **API Proxy**: Next.js Server Actions/Routes proxy LLM calls to prevent CORS issues and protect API keys.

### 2.3 Inference Engine
The intelligence layer that drives the reviews.
- **Model**: Utilizes `Qwen2.5-72B-Instruct` via the Hugging Face Inference API for deep technical reasoning.
- **System Prompting**: Engineered to simulate a senior security engineer, ensuring responses are structured as valid JSON for machine readability.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, TailwindCSS, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **LLM Orchestration** | OpenAI SDK (Hugging Face compatible), httpx |
| **DevOps** | Docker, Docker Compose, Vercel (Frontend) |
| **Standards** | OpenEnv Core, OWASP Top 10, CWE Top 25 |

---

## 4. Environment Mechanics (RL Specs)

### 4.1 Actions
Agents interacting with the environment can take the following structured actions:
- `add_comment`: Discuss a specific line of code.
- `classify_bug`: Assign a severity level (`critical`, `warning`, `nit`) to a line.
- `ask_question`: Seek clarification (for human-in-the-loop scenarios).
- `approve` / `request_changes`: Issue the final PR verdict.

### 4.2 Reward Function
Optimized for high-signal security auditing:
- **Accuracy**: Points awarded for correctly identifying ground-truth bugs via LLM-based verification.
- **Categorization**: Bonuses for correctly identifying the severity and type (e.g., SQLi, XSS).
- **Efficiency**: Step penalties encourage finding bugs quickly without spamming comments.
- **Verdict Alignment**: Significant rewards for issuing the correct Final Verdict based on PR risk.

---

## 5. Security Scanning Coverage
DeadlineEnv is configured to detect:
- **Injection Vulnerabilities**: SQL Injection, Command Injection, SSRF.
- **Broken Authentication**: Auth bypasses, missing checks, hardcoded credentials.
- **Logic Errors**: Race conditions, off-by-one errors, resource leaks.
- **Exposure**: Sensitive data in logs, exposed secrets.

---

## 6. Recent "Real Implementation" Upgrades
Following the "No-Mock" directive, the following components were upgraded:
1.  **AI Judge**: Replaced word-match heuristics with a dedicated LLM judge to grade review comments.
2.  **Inference Script**: Removed all deterministic fallbacks; the agent now relies entirely on model reasoning.
3.  **Unified Docker**: Created a root-level Docker orchestration that launches the real backend environment, ensuring portability and submission success.

---

## 7. Installation & Deployment

### Local Development
```bash
# Start both Frontend and Backend
python start.py
```

### Docker Deployment
```bash
# Build and run the environment
docker build -t deadline-env .
docker run -p 7860:7860 --env-file .env deadline-env
```

### Environment Variables
- `HF_TOKEN`: Required for model inference and environment grading.
- `API_BASE_URL`: The LLM endpoint (default: Hugging Face Router).
- `MODEL_NAME`: The target LLM (default: Qwen2.5-72B).
