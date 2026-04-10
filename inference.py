"""
DeadlineEnv inference script — OpenEnv Hackathon submission.

Logging format (required by validator):
  [START] task=<task_id> env=deadline-env model=<MODEL_NAME>
  [STEP]  step=<n> action=<action_str> reward=<0.00> done=<true|false> error=<msg|null>
  [END]   success=<true|false> steps=<n> score=<0.000> rewards=<r1,r2,...>

Environment variables:
  HF_TOKEN        — Hugging Face API key (required for LLM calls)
  API_BASE_URL    — LLM API endpoint (default: https://router.huggingface.co/v1)
  MODEL_NAME      — Model identifier (default: Qwen/Qwen2.5-72B-Instruct)
  DEADLINE_ENV_URL — Environment base URL (default: http://localhost:7860)
  DEADLINE_TASK   — Task difficulty: easy | medium | hard
                    (default: runs all 3 sequentially)
"""

import json
import os
import sys
import textwrap
import time
from typing import Optional

import httpx
from openai import OpenAI

# ── Config ─────────────────────────────────────────────────────────────────────
API_KEY      = os.getenv("HF_TOKEN") or os.getenv("API_KEY", "")
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME   = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
ENV_BASE_URL = os.getenv("DEADLINE_ENV_URL", "http://localhost:7860")
DEADLINE_TASK = os.getenv("DEADLINE_TASK", "")  # empty → run all 3

MAX_STEPS         = 20
SUCCESS_THRESHOLD = 0.4

# Retry settings for connecting to the env container
ENV_CONNECT_RETRIES     = 15
ENV_CONNECT_WAIT_BASE_S = 2.0   # seconds, doubles each attempt
ENV_CONNECT_WAIT_MAX_S  = 10.0

# ── OpenAI client (lazy — do NOT call at import time) ─────────────────────────
_client: Optional[OpenAI] = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not API_KEY:
            print("[WARN] HF_TOKEN not set — LLM calls will fail.", flush=True)
        _client = OpenAI(api_key=API_KEY or "dummy", base_url=API_BASE_URL)
    return _client


# ── System prompt ──────────────────────────────────────────────────────────────
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
    - Review ALL changed lines marked with an asterisk (*) in the diff.
    - Do NOT issue a final verdict (approve / request_changes) until you have reviewed
      all files and all changed lines.
    - For each bug found: first use 'add_comment' to explain the issue, then use
      'classify_bug' to set the severity (critical / warning / nit).
    - After flagging ALL bugs, issue 'request_changes' if any critical bugs exist,
      otherwise issue 'approve'.
    - Be systematic. Check line by line. You have enough steps to be thorough.
    - Never output anything except the JSON object.
""").strip()


# ── Logging helpers ────────────────────────────────────────────────────────────
def log_start(task: str, model: str) -> None:
    print(f"[START] task={task} env=deadline-env model={model}", flush=True)


def log_step(step: int, action: str, reward: float, done: bool,
             error: Optional[str]) -> None:
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


# ── Environment connection with retry + exponential backoff ───────────────────
def wait_for_env(base_url: str) -> None:
    """
    Block until the environment's /health endpoint responds 200, or raise
    after ENV_CONNECT_RETRIES attempts.  Prints clear progress logs so the
    validator can trace what is happening.
    """
    wait = ENV_CONNECT_WAIT_BASE_S
    for attempt in range(1, ENV_CONNECT_RETRIES + 1):
        try:
            print(
                f"[CONNECT] Attempt {attempt}/{ENV_CONNECT_RETRIES} → "
                f"GET {base_url}/health",
                flush=True,
            )
            with httpx.Client(timeout=8.0) as c:
                r = c.get(f"{base_url}/health")
            if r.status_code == 200:
                print(f"[CONNECT] Environment is ready (HTTP 200) ✓", flush=True)
                return
            print(
                f"[CONNECT] Got HTTP {r.status_code}, retrying in {wait:.0f}s …",
                flush=True,
            )
        except Exception as exc:
            print(
                f"[CONNECT] Connection failed ({exc.__class__.__name__}: {exc}), "
                f"retrying in {wait:.0f}s …",
                flush=True,
            )
        time.sleep(wait)
        wait = min(wait * 2, ENV_CONNECT_WAIT_MAX_S)

    raise RuntimeError(
        f"Environment at {base_url} did not become ready after "
        f"{ENV_CONNECT_RETRIES} attempts."
    )


# ── Prompt builder ─────────────────────────────────────────────────────────────
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


# ── Single episode ─────────────────────────────────────────────────────────────
def run_episode(task_difficulty: str, env_client: httpx.Client) -> dict:
    print(f"[EPISODE] Starting difficulty={task_difficulty}", flush=True)

    # --- Reset -----------------------------------------------------------------
    try:
        reset_resp = env_client.post(
            "/reset", json={"task_difficulty": task_difficulty}
        )
        reset_resp.raise_for_status()
    except Exception as exc:
        print(f"[ERROR] /reset failed: {exc}", flush=True)
        raise

    obs      = reset_resp.json()["observation"]
    task_id  = obs["task_id"]
    max_steps = obs["step"] + obs["steps_remaining"]

    log_start(task_id, MODEL_NAME)

    rewards     : list[float] = []
    history     : list[dict]  = []
    done        = False
    step        = 0
    total_score = 0.0
    client      = get_client()

    while not done and step < max_steps:
        # --- Build prompt -------------------------------------------------------
        user_prompt = build_user_prompt(obs)
        history.append({"role": "user", "content": user_prompt})

        # --- LLM call -----------------------------------------------------------
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "system", "content": SYSTEM_PROMPT}]
                         + history[-8:],
                max_tokens=300,
                temperature=0.2,
            )
            raw = response.choices[0].message.content.strip()
        except Exception as exc:
            print(f"[WARN] LLM call failed at step {step + 1}: {exc}", flush=True)
            # On LLM failure emit a safe structured action and continue
            raw = json.dumps({
                "action_type": "request_changes",
                "line_number": None,
                "content": "Unable to complete review — requesting changes as a precaution.",
            })

        history.append({"role": "assistant", "content": raw})

        # --- Parse action -------------------------------------------------------
        # Strip optional markdown fences the model sometimes adds
        clean = raw.strip()
        if clean.startswith("```"):
            clean = "\n".join(clean.split("\n")[1:])
        if clean.endswith("```"):
            clean = "\n".join(clean.split("\n")[:-1])
        clean = clean.strip()

        try:
            action = json.loads(clean)
        except json.JSONDecodeError:
            # Try extracting the first JSON object from the string
            import re
            m = re.search(r"\{.*?\}", clean, re.DOTALL)
            if m:
                try:
                    action = json.loads(m.group())
                except Exception:
                    action = None
            else:
                action = None

        if not isinstance(action, dict) or "action_type" not in action or "content" not in action:
            print(f"[WARN] Bad model output at step {step + 1}, using safe action. raw={raw[:120]}", flush=True)
            action = {
                "action_type": "request_changes",
                "line_number": None,
                "content": "Review incomplete — requesting changes.",
            }

        # --- Step the environment -----------------------------------------------
        try:
            step_resp = env_client.post("/step", json={"action": action})
            step_resp.raise_for_status()
            result = step_resp.json()
        except Exception as exc:
            print(f"[ERROR] /step failed at step {step + 1}: {exc}", flush=True)
            raise

        obs         = result["observation"]
        reward      = float(result.get("reward", 0.0))
        done        = bool(result.get("done", False))
        error_msg   = obs.get("last_action_error")
        total_score += reward
        rewards.append(reward)
        step += 1

        log_step(step, action["action_type"], reward, done, error_msg)

    import math
    # Map raw rewards to (0, 1) strictly using sigmoid, and clamp to ensure rounding doesn't hit 1.000 or 0.000
    normalized_score = 1.0 / (1.0 + math.exp(-total_score))
    final_score = max(0.001, min(0.999, normalized_score))

    success = total_score >= SUCCESS_THRESHOLD
    log_end(success, step, final_score, rewards)
    return {"task": task_difficulty, "success": success, "steps": step, "score": final_score}


# ── Entry point ────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"[INIT] DeadlineEnv inference — env={ENV_BASE_URL}", flush=True)
    print(f"[INIT] Model: {MODEL_NAME}", flush=True)
    print(f"[INIT] HF_TOKEN present: {bool(API_KEY)}", flush=True)

    # Wait for the environment container to be ready before doing anything else
    try:
        wait_for_env(ENV_BASE_URL)
    except RuntimeError as exc:
        print(f"[FATAL] {exc}", flush=True)
        sys.exit(1)

    tasks_to_run = (
        [DEADLINE_TASK] if DEADLINE_TASK else ["easy", "medium", "hard"]
    )
    print(f"[INIT] Running tasks: {tasks_to_run}", flush=True)

    results: list[dict] = []
    with httpx.Client(base_url=ENV_BASE_URL, timeout=120.0) as env_client:
        for task in tasks_to_run:
            print(f"\n{'=' * 60}", flush=True)
            print(f"Running task: {task}", flush=True)
            print(f"{'=' * 60}", flush=True)
            try:
                result = run_episode(task, env_client)
                results.append(result)
            except Exception as exc:
                print(f"[ERROR] Episode '{task}' failed: {exc}", flush=True)
                log_end(False, 0, 0.01, [])
                results.append(
                    {"task": task, "success": False, "steps": 0, "score": 0.01}
                )

    print(f"\n{'=' * 60}", flush=True)
    print("SUMMARY", flush=True)
    for r in results:
        print(
            f"  {r['task']:8s}  score={r['score']:.3f}  "
            f"success={r['success']}  steps={r['steps']}",
            flush=True,
        )
    print(f"{'=' * 60}", flush=True)


if __name__ == "__main__":
    main()
