# DeadlineEnv Backend

Python OpenEnv RL environment for code review under deadline pressure.

## Quick start

```bash
pip install -r server/requirements.txt
uvicorn server.app:app --host 0.0.0.0 --port 7860
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check — returns `{"status": "ok"}` |
| POST | `/reset` | Start new episode. Body: `{"task_difficulty": "easy"}` |
| POST | `/step` | Take an action. Body: `{"action": {...}}` |
| GET | `/state` | Get full internal state including ground truth |

## Running the inference script

```bash
export HF_TOKEN=hf_your_token_here
export MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
python inference.py
```

## Docker

```bash
docker build -f server/Dockerfile -t deadlineenv .
docker run -p 7860:7860 deadlineenv
```

## Structure

```
backend/
├── models.py                  # Pydantic action/observation/state models
├── client.py                  # HTTP client wrapper for training code
├── inference.py               # Baseline inference script (judges run this)
├── openenv.yaml               # OpenEnv manifest
├── pyproject.toml             # Package metadata
└── server/
    ├── app.py                 # FastAPI application
    ├── deadline_environment.py # Core RL state machine
    ├── requirements.txt
    ├── Dockerfile
    ├── tasks/                 # Task loaders (easy/medium/hard)
    ├── graders/               # Comment, verdict, severity graders
    └── corpus/                # 30 real diff tasks (10 per difficulty)
        ├── easy/              # easy_001.py — easy_010.py
        ├── medium/            # medium_001.py — medium_010.py
        └── hard/              # hard_001.py — hard_010.py
```
