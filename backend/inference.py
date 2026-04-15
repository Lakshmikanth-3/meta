"""
DeadlineEnv baseline inference script.

Logging format:
  [START] task=<task_id> env=deadline-env model=<MODEL_NAME>
  [STEP]  step=<n> action=<action_str> reward=<0.00> done=<true|false> error=<msg|null>
  [END]   success=<true|false> steps=<n> score=<0.000> rewards=<r1,r2,...>

Environment variables:
  API_BASE_URL   — LLM API endpoint (default: https://router.huggingface.co/v1)
  MODEL_NAME     — Model identifier (default: Qwen/Qwen2.5-72B-Instruct)
    OXLO_API_KEY   — API key (preferred)
    OPENAI_API_KEY — API key fallback
    API_KEY        — Generic API key fallback
    HF_TOKEN       — Backward-compatible fallback
  DEADLINE_TASK  — Task difficulty: easy | medium | hard (default: runs all 3)
  DEADLINE_ENV_URL — Environment base URL (default: http://localhost:7860)
"""

import os
import json
import textwrap
from typing import Optional

import httpx
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_KEY = (
    os.getenv("OXLO_API_KEY")
    or os.getenv("OPENAI_API_KEY")
    or os.getenv("API_KEY")
    or os.getenv("HF_TOKEN")
    or ""
)
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
ENV_BASE_URL = os.getenv("DEADLINE_ENV_URL", "http://localhost:7860")
MAX_STEPS = 20
SUCCESS_THRESHOLD = 0.4

client = OpenAI(api_key=API_KEY, base_url=API_BASE_URL)

SYSTEM_PROMPT = textwrap.dedent("""
    You are a senior software engineer doing a code review under deadline pressure.
    You will receive a pull request diff and must review it carefully.

    Respond ONLY with a valid JSON object matching this schema — no markdown, no explanation:
    {
      "action_type": "add_comment" | "ask_question" | "classify_bug" | "approve" | "request_changes",
      "line_number": <integer or null>,
      "content": "<string>"
    }

    Review Process & Rules:
    - Review ALL changed lines marks with an asterisk (*) in the diff.
    - Do NOT issue a final verdict (approve / request_changes) until you have reviewed all files and all changed lines.
    - Task 2 (Medium) and Task 3 (Hard) often contain multiple bugs across multiple files.
    - For each bug found: first use 'add_comment' to explain the issue, then use 'classify_bug' to set the severity.
    - After you have flagged ALL bugs in the PR, only then issue your final 'request_changes' or 'approve' action.
    - If you see no critical bugs after reviewing all changes, issue 'approve'.
    - If you see any critical bugs after reviewing all changes, issue 'request_changes'.
    - Be systematic. Check line by line, step by step. You have enough steps to be thorough.
    - Never output anything except the JSON object.
""").strip()


def log_start(task: str, model: str) -> None:
    print(f"[START] task={task} env=deadline-env model={model}", flush=True)


def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    error_val = error if error else "null"
    print(
        f"[STEP] step={step} action={action} reward={reward:.2f} "
        f"done={str(done).lower()} error={error_val}",
        flush=True,
    )


def log_end(success: bool, steps: int, score: float, rewards: list) -> None:
    rewards_str = ",".join(f"{r:.2f}" for r in rewards)
    print(
        f"[END] success={str(success).lower()} steps={steps} "
        f"score={score:.3f} rewards={rewards_str}",
        flush=True,
    )


def build_user_prompt(obs: dict) -> str:
    diff_text = ""
    for diff in obs.get("diffs", []):
        diff_text += f"\n### {diff['filename']} ({diff['language']})\n"
        for i, line in enumerate(diff["lines"], start=1):
            marker = " *" if i in diff.get("changed_line_numbers", []) else "  "
            diff_text += f"{i:3d}{marker} {line}\n"

    comments_text = ""
    for c in obs.get("comments_so_far", []):
        comments_text += (
            f"  Step {c['step']}: [{c['action_type']}] "
            f"line={c.get('line_number', 'N/A')} — {c['content']}\n"
        )

    return textwrap.dedent(f"""
        PR: {obs['pr_title']}
        Description: {obs['pr_description']}
        Step: {obs['step']} / {obs['step'] + obs['steps_remaining']}
        System: {obs['system_message']}

        DIFF:
        {diff_text}

        YOUR COMMENTS SO FAR:
        {comments_text or '  (none yet)'}

        Issue your next review action as JSON.
    """).strip()


def run_episode(task_difficulty: str) -> dict:
    import time
    with httpx.Client(base_url=ENV_BASE_URL, timeout=60.0) as env_client:
        # Wait for the environment to become ready
        max_retries = 5
        for attempt in range(max_retries):
            try:
                reset_resp = env_client.post("/reset", json={"task_difficulty": task_difficulty})
                reset_resp.raise_for_status()
                obs = reset_resp.json()["observation"]
                task_id = obs["task_id"]
                break
            except Exception as e:
                print(f"Waiting for env... (attempt {attempt+1}/{max_retries}) | {e}", flush=True)
                time.sleep(2)
        else:
            raise RuntimeError("Environment failed to become ready after 10 seconds.")

        log_start(task_id, MODEL_NAME)

        rewards = []
        history = []
        done = False
        step = 0
        total_score = 0.0
        max_steps = obs["step"] + obs["steps_remaining"]

        while not done and step < max_steps:
            user_prompt = build_user_prompt(obs)
            history.append({"role": "user", "content": user_prompt})

            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history[-8:],
                max_tokens=300,
                temperature=0.2,
            )
            raw = response.choices[0].message.content.strip()

            history.append({"role": "assistant", "content": raw})

            try:
                action = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Model returned invalid JSON action: {raw}") from exc

            if not isinstance(action, dict):
                raise RuntimeError(f"Model action payload must be an object, got: {type(action).__name__}")

            if "action_type" not in action or "content" not in action:
                raise RuntimeError(f"Model action missing required fields: {action}")

            step_resp = env_client.post("/step", json={"action": action})
            step_resp.raise_for_status()
            result = step_resp.json()

            obs = result["observation"]
            reward = result["reward"]
            done = result["done"]
            error = obs.get("last_action_error")
            total_score += reward
            rewards.append(reward)
            step += 1

            log_step(step, action["action_type"], reward, done, error)
        import math
        normalized_score = 1.0 / (1.0 + math.exp(-total_score))
        final_score = max(0.001, min(0.999, normalized_score))

        success = total_score >= SUCCESS_THRESHOLD
        log_end(success, step, final_score, rewards)
        return {"task": task_difficulty, "success": success, "steps": step, "score": final_score}


if __name__ == "__main__":
    tasks_to_run = ["easy", "medium", "hard"]
    results = []
    for task in tasks_to_run:
        print(f"\n{'='*60}", flush=True)
        print(f"Running task: {task}", flush=True)
        print(f"{'='*60}", flush=True)
        try:
            result = run_episode(task)
            results.append(result)
        except Exception as exc:
            print(f"[ERROR] Episode '{task}' failed: {exc}", flush=True)
            log_end(False, 0, 0.01, [])
            results.append({"task": task, "success": False, "steps": 0, "score": 0.01})

    print(f"\n{'='*60}", flush=True)
    print("SUMMARY", flush=True)
    for r in results:
        print(f"  {r['task']:8s}  score={r['score']:.3f}  success={r['success']}", flush=True)
    print(f"{'='*60}", flush=True)
