FROM python:3.11-slim

WORKDIR /app

# ── System packages ────────────────────────────────────────────────────────────
# curl is required for the Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
COPY . .

# ── Python path: backend/ contains models.py and server/ package ───────────────
ENV PYTHONPATH=/app/backend

# ── Runtime environment variables (overrideable at docker run time) ────────────
ENV PORT=7860
ENV HOST=0.0.0.0
ENV WORKERS=1
# HF_TOKEN, API_BASE_URL, MODEL_NAME must be supplied at runtime

# ── Expose the API port ────────────────────────────────────────────────────────
EXPOSE 7860

# ── Health check so OpenEnv / docker-compose knows when we are ready ──────────
# Start checking 10 s after container start, retry every 5 s, 3 retries → 25 s window
HEALTHCHECK --interval=5s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -f http://localhost:7860/health || exit 1

# ── Foreground server — MUST NOT daemonise ─────────────────────────────────────
# uvicorn blocks forever; the healthcheck above tells the orchestrator when ready.
CMD ["uvicorn", "server.app:app", \
     "--host", "0.0.0.0", \
     "--port", "7860", \
     "--workers", "1", \
     "--log-level", "info"]
