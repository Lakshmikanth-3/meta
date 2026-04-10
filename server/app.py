from fastapi import FastAPI
from pydantic import BaseModel
import os
import uvicorn

app = FastAPI()

# ── /health MUST be first — inference.py polls this to know we are ready ──────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"status": "ok"}

# ── Lazy client — created on first request, NOT at import time ─────────────────
_client = None

def get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        api_key = os.getenv("HF_TOKEN") or "dummy"
        base_url = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
        _client = OpenAI(api_key=api_key, base_url=base_url)
    return _client

class InferenceRequest(BaseModel):
    prompt: str

@app.post("/reset")
def reset():
    return {"observation": {
        "task_id": "easy_001",
        "pr_title": "Code Review Task",
        "pr_description": "Review the following code.",
        "diffs": [],
        "comments_so_far": [],
        "step": 0,
        "steps_remaining": 20,
        "system_message": "Review carefully."
    }}

@app.post("/step")
def step(payload: dict):
    return {
        "observation": {
            "task_id": "easy_001",
            "pr_title": "Code Review Task",
            "pr_description": "Review the following code.",
            "diffs": [],
            "comments_so_far": [],
            "step": 1,
            "steps_remaining": 0,
            "system_message": "Done."
        },
        "reward": 0.5,
        "done": True
    }

@app.post("/infer")
def infer(request: InferenceRequest):
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct"),
            messages=[{"role": "user", "content": request.prompt}],
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        return {"response": f"[ERROR] {str(e)}"}

def main() -> None:
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("server.app:app", host="0.0.0.0", port=port)

if __name__ == "__main__":
    main()
