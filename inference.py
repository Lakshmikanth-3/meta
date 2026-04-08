"""
DeadlineEnv inference script (submission format compliant).

Required env vars:
  HF_TOKEN
  API_BASE_URL (default provided)
  MODEL_NAME   (default provided)
  LOCAL_IMAGE_NAME (optional, for docker-image based envs)

Optional env vars:
  DEADLINE_ENV_URL (default: http://localhost:7860)
  DEADLINE_TASK    (default: easy)
"""

import json
import os
from typing import Optional

import httpx
from openai import OpenAI

API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
HF_TOKEN = os.getenv("HF_TOKEN")
LOCAL_IMAGE_NAME = os.getenv("LOCAL_IMAGE_NAME")

DEADLINE_ENV_URL = os.getenv("DEADLINE_ENV_URL", "http://localhost:7860")
DEADLINE_TASK = os.getenv("DEADLINE_TASK", "easy")

MAX_STEPS = 20
MAX_TOKENS = 300
TEMPERATURE = 0.2

# Normalization for score in [0, 1].
MAX_REWARD_PER_STEP = 1.0

SYSTEM_PROMPT = (
    "You are a senior software engineer doing code review under deadline pressure. "
    "Respond with a valid JSON object only: "
    "{\"action_type\": string, \"line_number\": int|null, \"content\": string}."
)


def log_start(task: str, env_name: str, model: str) -> None:
    print(f"[START] task={task} env={env_name} model={model}", flush=True)


def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    error_val = error if error else "null"
    print(
        f"[STEP] step={step} action={action} reward={reward:.2f} "
        f"done={str(done).lower()} error={error_val}",
        flush=True,
    )


def log_end(success: bool, steps: int, score: float, rewards: list[float]) -> None:
    rewards_str = ",".join(f"{r:.2f}" for r in rewards)
    print(
        f"[END] success={str(success).lower()} steps={steps} "
        f"score={score:.3f} rewards={rewards_str}",
        flush=True,
    )


def build_prompt(obs: dict) -> str:
    diffs = obs.get("diffs", [])
    chunks = []
    for diff in diffs:
        lines = diff.get("lines", [])
        changed = set(diff.get("changed_line_numbers", []))
        body = []
        for idx, line in enumerate(lines, start=1):
            mark = "*" if idx in changed else " "
            body.append(f"{idx:3d}{mark} {line}")
        chunks.append(f"FILE: {diff.get('filename', 'unknown')}\n" + "\n".join(body))

    return (
        f"PR: {obs.get('pr_title', '')}\n"
        f"Description: {obs.get('pr_description', '')}\n"
        f"Step: {obs.get('step', 0)}\n\n"
        f"Diff:\n{chr(10).join(chunks)}\n\n"
        "Return next JSON action."
    )


def fallback_action(obs: dict) -> dict:
    # Produce a safe deterministic action when model calls are unavailable.
    diffs = obs.get("diffs", [])
    line_number = None
    for diff in diffs:
        changed = diff.get("changed_line_numbers", [])
        if changed:
            line_number = int(changed[0])
            break

    step = int(obs.get("step", 0) or 0)
    if step <= 1:
        return {
            "action_type": "add_comment",
            "line_number": line_number,
            "content": "Potential logic issue detected; please review this change.",
        }
    if step == 2:
        return {
            "action_type": "classify_bug",
            "line_number": line_number,
            "content": "warning",
        }
    return {
        "action_type": "request_changes",
        "line_number": None,
        "content": "Please address review comments before merge.",
    }


def main() -> None:
    rewards: list[float] = []
    steps = 0
    done = False
    success = False
    score = 0.0
    task_name = DEADLINE_TASK
    client = None

    try:
        if HF_TOKEN:
            client = OpenAI(api_key=HF_TOKEN, base_url=API_BASE_URL)

        with httpx.Client(base_url=DEADLINE_ENV_URL, timeout=60.0) as env_client:
            obs = {}
            reset_resp = env_client.post("/reset", json={"task_difficulty": DEADLINE_TASK})
            reset_resp.raise_for_status()
            obs = reset_resp.json()["observation"]
            task_name = obs.get("task_id", DEADLINE_TASK)

            log_start(task_name, "deadline-env", MODEL_NAME)

            for step in range(1, MAX_STEPS + 1):
                action = fallback_action(obs)
                if client is not None:
                    try:
                        prompt = build_prompt(obs)
                        completion = client.chat.completions.create(
                            model=MODEL_NAME,
                            messages=[
                                {"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": prompt},
                            ],
                            max_tokens=MAX_TOKENS,
                            temperature=TEMPERATURE,
                        )
                        raw = (completion.choices[0].message.content or "").strip()
                        action = json.loads(raw)
                    except Exception:
                        # Fall back to deterministic valid actions when model output/network fails.
                        action = fallback_action(obs)

                step_resp = env_client.post("/step", json={"action": action})
                step_resp.raise_for_status()
                result = step_resp.json()

                obs = result.get("observation", {})
                reward = float(result.get("reward", 0.0) or 0.0)
                done = bool(result.get("done", False))
                error = obs.get("last_action_error")

                rewards.append(reward)
                steps = step
                action_text = str(action.get("action_type", "unknown"))
                log_step(step, action_text, reward, done, error)

                if done:
                    break

            total = sum(rewards)
            denom = max(steps * MAX_REWARD_PER_STEP, 1.0)
            score = max(0.0, min(1.0, total / denom))
            success = score >= 0.4

    except Exception as exc:
        if steps == 0:
            log_start(task_name, "deadline-env", MODEL_NAME)
        log_step(max(steps, 1), "error", 0.0, True, str(exc))
        done = True
    finally:
        log_end(success, steps, score, rewards)


if __name__ == "__main__":
    main()
