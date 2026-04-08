# DeadlineEnv: AI-Powered Security Code Reviewer

DeadlineEnv is a professional-grade security code review platform. It features an interactive **Security Reviewer Playground** that uses advanced LLMs to scan code repositories or snippets for vulnerabilities, logic bugs, and quality issues under simulate production pressure.

---

## ⚡ The Security Reviewer Playground

The playground provides a cinematic, high-performance environment for security engineering:

*   **GitHub Integration**: Provide a public repository URL to pull and scan files directly.
*   **Manual Paste Mode**: Paste code snippets or full files for instant analysis.
*   **Real-Time Scanner**: Watch as the AI performs a line-by-line security audit.
*   **Interactive Findings**: Get detailed reports with Severity Badges, CWE citations, and specific Fix Suggestions.
*   **Premium Glassmorphism UI**: A dark-mode dashboard designed for maximum focus and low eye strain during critical reviews.

---

## 🛡️ Security Audit Capabilities

The AI engine scans for:
- **Critical Vulnerabilities**: SQL Injection, Auth Bypass, XSS, CSRF, Path Traversal, SSRF.
- **Logic Bugs**: Race conditions, atomicity issues, off-by-one errors, and null pointer dereferences.
- **Code Quality**: Resource leaks, missing error handling, and hardcoded credentials.

---

## 🚀 Setup & Installation

### Option 1: One-Click Start (Recommended)
This will launch both the Backend and Frontend with a single command:
1.  **Clone and Configure**:
    ```bash
    git clone https://github.com/Lakshmikanth-3/meta
    cd meta
    cp .env.example .env
    # Add your HF_TOKEN to .env
    ```
2.  **Run with Python**:
    ```bash
    python start.py
    ```

### Option 2: Manual Local Development

1. **Clone and Configure**:
   ```bash
   git clone https://github.com/Lakshmikanth-3/meta
   cd meta
   cp .env.example .env
   # Add your HF_TOKEN to .env
   ```

2. **Terminal 1: Start Backend (FastAPI)**:
   ```bash
   cd backend
   # If using the project's venv:
   ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
   $env:PYTHONPATH="."
   ..\.venv\Scripts\python.exe -m uvicorn server.app:app --host 0.0.0.0 --port 7860 --reload
   ```

3. **Terminal 2: Start Frontend (Next.js)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the App**:
   - **Landing Page**: `http://localhost:3000`
   - **Reviewer Dashboard**: `http://localhost:3000/playground`

---

## 🧠 Environment & Agent Training

Beyond the interactive dashboard, DeadlineEnv is a full **OpenEnv** RL environment. Agents learn to review pull requests by taking structured actions:
- `add_comment`: Leave precise technical feedback.
- `classify_bug`: Label lines as `critical`, `warning`, `nit`, or `ok`.
- `issue_verdict`: Make the call—`approve` or `request_changes`.

The reward function is optimized for **accuracy**, **efficiency**, and **high-signal-to-noise ratio**.

---

## 📊 Baseline Performance

Run with `Qwen/Qwen2.5-72B-Instruct` via HuggingFace:

| Task | Difficulty | Avg Score | Success Rate |
|---|---|---|---|
| easy-* | Easy | 0.78 | 91% |
| medium-* | Medium | 0.54 | 67% |
| hard-* | Hard | 0.31 | 38% |

---

## Acknowledgements
Built for the OpenEnv Hackathon. Designed for the reality of security engineers who need to find critical bugs before they reach production.

OpenEnv: [huggingface.co/open-env](https://huggingface.co/open-env)
