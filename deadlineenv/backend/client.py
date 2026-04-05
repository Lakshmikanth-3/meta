"""Client wrapper for training code to interact with DeadlineEnv server."""
import httpx
from .models import DeadlineAction, DeadlineObservation, DeadlineState


class DeadlineEnvClient:
    def __init__(self, base_url: str = "http://localhost:7860"):
        self._client = httpx.Client(base_url=base_url, timeout=30.0)

    def reset(self, task_difficulty: str = "easy") -> DeadlineObservation:
        resp = self._client.post("/reset", json={"task_difficulty": task_difficulty})
        resp.raise_for_status()
        return DeadlineObservation(**resp.json()["observation"])

    def step(self, action: DeadlineAction) -> tuple:
        resp = self._client.post("/step", json={"action": action.model_dump()})
        resp.raise_for_status()
        data = resp.json()
        return (
            DeadlineObservation(**data["observation"]),
            data["reward"],
            data["done"],
            data["info"],
        )

    def state(self) -> DeadlineState:
        resp = self._client.get("/state")
        resp.raise_for_status()
        return DeadlineState(**resp.json())

    def close(self):
        self._client.close()
