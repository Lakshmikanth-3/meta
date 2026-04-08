from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from models import DeadlineAction, DeadlineObservation, DeadlineState
from server.deadline_environment import DeadlineEnvironment

app = FastAPI(title="DeadlineEnv", version="1.0.0")

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reset")
def reset(req: ResetRequest):
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
