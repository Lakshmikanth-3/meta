from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from openai import OpenAI

from models import DeadlineAction, DeadlineObservation, DeadlineState
from server.deadline_environment import DeadlineEnvironment

app = FastAPI(title="DeadlineEnv", version="1.0.0")

# ── Lazy OpenAI client — never crash at import/startup time ───────────────────
_client: Optional[OpenAI] = None


def _resolve_api_key() -> str:
    return (
        os.getenv("OXLO_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("API_KEY")
        or os.getenv("HF_TOKEN")
        or "dummy"
    )

def _get_llm_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=os.getenv("API_BASE_URL", "https://router.huggingface.co/v1"),
            api_key=_resolve_api_key(),
        )
    return _client

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared environment instance per worker
_env = DeadlineEnvironment()


class ResetRequest(BaseModel):
    task_difficulty: Optional[str] = "easy"
    custom_task: Optional[dict] = None


class StepRequest(BaseModel):
    action: DeadlineAction


class InferenceRequest(BaseModel):
    prompt: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reset")
def reset(req: Optional[ResetRequest] = None):
    req = req or ResetRequest()
    try:
        obs = _env.reset(
            task_difficulty=req.task_difficulty or "easy",
            custom_task=req.custom_task
        )
        return {"observation": obs.model_dump()}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/step")
def step(req: StepRequest):
    try:
        obs, reward, done, info = _env.step(req.action)
        return {
            "observation": obs.model_dump(),
            "reward": reward,
            "done": done,
            "info": info,
        }
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/state")
def state():
    try:
        s = _env.state()
        return s.model_dump()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/infer")
def infer(req: InferenceRequest):
    response = _get_llm_client().chat.completions.create(
        model=os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct"),
        messages=[{"role": "user", "content": req.prompt}],
    )
    return {"response": response.choices[0].message.content}
