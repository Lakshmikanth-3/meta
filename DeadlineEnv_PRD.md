# PRD: DeadlineEnv — Code Review Under Pressure

> An OpenEnv RL environment where an AI agent learns to review pull requests like a battle-hardened senior engineer racing against a production deployment deadline.

---

## 1. The Idea

Every software engineer knows this feeling: it is 11:47 PM. A pull request needs to merge before the 12 AM production deploy window. The diff is 600 lines. Your eyes are tired. You need to find the bug, write the comment, and make the call — approve or block. Indian engineers at product companies live this reality multiple times a week. The cost of missing a bug is a 3 AM rollback. The cost of blocking a correct PR is a delayed feature and an angry PM.

**DeadlineEnv** simulates this. An AI agent receives a code diff (Python or JavaScript), a PR description, and surrounding context. It must review the PR by taking structured review actions across multiple turns — adding inline comments, asking clarifying questions, classifying bugs by severity, and finally issuing a verdict (approve / request-changes / block). The reward signal is shaped across the full episode, rewarding bug detection accuracy, comment quality, review efficiency, and penalizing missed critical bugs and spurious noise.

This is not a game. This is not a toy. Every company with a software team needs this agent. And no one has built it yet.

---

## 2. Why This Wins

| Criterion | How DeadlineEnv wins |
|---|---|
| Real-world utility (30%) | Code review is a daily, high-stakes workflow at every tech company. A trained agent here has direct production value as a GitHub bot or CI step. |
| Task & grader quality (25%) | Three tasks with genuine difficulty gradient: comment accuracy grader is fully deterministic — bugs in code are ground-truth checkable. |
| Environment design (20%) | Rich shaped reward across the trajectory. Clean state machine. Step penalty creates urgency realism. |
| Code quality (15%) | Pure Python state machine, no GPU needed, trivially Dockerisable, under 200ms per step. |
| Creativity & novelty (10%) | No code review env exists in OpenEnv. The pressure mechanic (step budget = deadline) is a novel design choice. |

---

## 3. Project Structure

```
deadlineenv/
├── frontend/                          # Next.js 14 app (App Router)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing + live demo page
│   │   ├── demo/
│   │   │   └── page.tsx               # Interactive agent playground
│   │   └── docs/
│   │       └── page.tsx               # API docs + task descriptions
│   ├── components/
│   │   ├── DiffViewer.tsx             # Side-by-side diff with inline comment markers
│   │   ├── ReviewTerminal.tsx         # Agent action feed (terminal aesthetic)
│   │   ├── RewardGraph.tsx            # Live reward trajectory chart
│   │   ├── TaskCard.tsx               # Task difficulty card
│   │   └── StatusBadge.tsx            # Approve / block / pending badge
│   ├── lib/
│   │   ├── api.ts                     # Fetch wrapper for backend
│   │   └── types.ts                   # Shared TypeScript types
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # OpenEnv environment (Python)
│   ├── __init__.py                    # Exports DeadlineAction, DeadlineObservation, DeadlineEnv
│   ├── models.py                      # Pydantic Action / Observation / State models
│   ├── client.py                      # DeadlineEnv(EnvClient) for training code
│   ├── openenv.yaml                   # OpenEnv manifest
│   ├── pyproject.toml                 # Package dependencies
│   ├── server/
│   │   ├── __init__.py
│   │   ├── app.py                     # FastAPI app via create_app()
│   │   ├── deadline_environment.py    # Core environment logic
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── task_easy.py           # Task 1: single-file bug hunt
│   │   │   ├── task_medium.py         # Task 2: cross-file refactor review
│   │   │   └── task_hard.py           # Task 3: security + logic review under time pressure
│   │   ├── graders/
│   │   │   ├── __init__.py
│   │   │   ├── comment_grader.py      # Scores inline comment accuracy
│   │   │   ├── verdict_grader.py      # Scores final approve/block decision
│   │   │   └── severity_grader.py     # Scores bug severity classification
│   │   ├── corpus/
│   │   │   ├── easy/                  # 10+ seeded diffs for easy task
│   │   │   ├── medium/                # 10+ seeded diffs for medium task
│   │   │   └── hard/                  # 10+ seeded diffs for hard task
│   │   └── Dockerfile
│   ├── inference.py                   # Baseline inference script (root of backend/)
│   └── README.md
│
├── .env.example
├── docker-compose.yml
└── README.md                          # Root README (full project)
```

---

## 4. OpenEnv Specification

### 4.1 `openenv.yaml`

```yaml
spec_version: 1
name: deadline-env
type: environment
runtime: python
app: server.app:app
port: 7860
metadata:
  description: "Code review RL environment — agent reviews pull request diffs under deadline pressure"
  tags: [code-review, software-engineering, real-world, text]
  difficulty_range: [easy, medium, hard]
  max_steps: 20
  action_space: discrete+structured
  observation_space: text+structured
```

### 4.2 Pydantic Models (`backend/models.py`)

```python
from __future__ import annotations
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    ADD_COMMENT = "add_comment"          # Place an inline review comment on a line
    ASK_QUESTION = "ask_question"        # Ask PR author a clarifying question
    CLASSIFY_BUG = "classify_bug"        # Label a line: critical | warning | nit | ok
    APPROVE = "approve"                  # Approve the PR — episode ends
    REQUEST_CHANGES = "request_changes"  # Block PR with summary — episode ends


class BugSeverity(str, Enum):
    CRITICAL = "critical"   # Will cause production failure / security vulnerability
    WARNING = "warning"     # Incorrect logic, not immediately fatal
    NIT = "nit"             # Style / minor suggestion
    OK = "ok"               # Line is correct


class DeadlineAction(BaseModel):
    """One agent action per step."""
    action_type: ActionType = Field(..., description="Which review action to take")
    line_number: Optional[int] = Field(
        None,
        description="Target line in the diff (required for add_comment and classify_bug)",
    )
    content: str = Field(
        ...,
        description=(
            "For add_comment / ask_question: the text of the comment. "
            "For classify_bug: one of critical | warning | nit | ok. "
            "For approve / request_changes: a short summary justification."
        ),
    )


class FileDiff(BaseModel):
    filename: str
    language: str                      # python | javascript | typescript | go
    lines: list[str]                   # Full diff lines (unified diff format)
    changed_line_numbers: list[int]    # Lines marked as +/- in the diff


class ReviewComment(BaseModel):
    step: int
    line_number: Optional[int]
    action_type: ActionType
    content: str
    reward_earned: float


class DeadlineObservation(BaseModel):
    """What the agent sees each step."""
    task_id: str                        # e.g. "easy-001", "hard-007"
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]              # One or more file diffs
    total_lines_changed: int
    step: int                          # Current step number (0-indexed)
    steps_remaining: int               # Steps left before forced termination
    comments_so_far: list[ReviewComment]
    last_action_error: Optional[str]   # Non-null if last action was invalid
    system_message: str                # Contextual nudge, e.g. "3 steps left. Deadline in 5 min."


class DeadlineState(BaseModel):
    """Full internal state — returned by state()."""
    task_id: str
    task_difficulty: Literal["easy", "medium", "hard"]
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]
    ground_truth_bugs: list[dict]      # [{line: int, severity: str, description: str}]
    comments_so_far: list[ReviewComment]
    verdict: Optional[str]             # None until approve/request_changes
    step: int
    done: bool
    total_reward: float
    episode_id: str
```

### 4.3 Environment Logic (`backend/server/deadline_environment.py`)

The environment must implement:

- `reset() -> DeadlineObservation` — randomly sample a task corpus entry, initialise state, return initial observation. Seeded sampling uses episode UUID for reproducibility.
- `step(action: DeadlineAction) -> tuple[DeadlineObservation, float, bool, dict]` — process the action, compute step reward, update state, return next observation.
- `state() -> DeadlineState` — return full current state (used by graders and the frontend).

**Step reward computation logic:**

```python
def compute_step_reward(action: DeadlineAction, state: DeadlineState) -> float:
    reward = 0.0

    if action.action_type == ActionType.ADD_COMMENT:
        # Score comment against ground truth bugs on that line
        if action.line_number in ground_truth_bug_lines:
            matched_bug = get_bug(state, action.line_number)
            # Semantic similarity score (0.0–1.0) using simple keyword overlap
            # No LLM call — use bag-of-words overlap against ground truth description
            overlap = keyword_overlap(action.content, matched_bug["description"])
            reward += 0.3 * overlap                 # Partial credit for relevant comment
            if overlap > 0.6:
                reward += 0.2                       # Bonus for high-quality comment
        else:
            reward -= 0.05                          # Noise penalty: commenting on clean line

    elif action.action_type == ActionType.CLASSIFY_BUG:
        if action.line_number in ground_truth_bug_lines:
            correct_severity = get_bug(state, action.line_number)["severity"]
            if action.content == correct_severity:
                reward += 0.25                      # Exact severity match
            elif severity_adjacent(action.content, correct_severity):
                reward += 0.1                       # Off by one level
        else:
            reward -= 0.05                          # Misclassification of clean line

    elif action.action_type == ActionType.ASK_QUESTION:
        reward += 0.05                              # Small positive: shows engagement
        # No negative — questions are exploratory

    elif action.action_type in (ActionType.APPROVE, ActionType.REQUEST_CHANGES):
        reward += compute_verdict_reward(action, state)   # See verdict_grader.py
        # Episode ends after this

    # Step penalty — each step costs 0.02 (urgency signal)
    reward -= 0.02

    return round(reward, 4)
```

**Verdict reward logic (`backend/server/graders/verdict_grader.py`):**

```python
def compute_verdict_reward(action: DeadlineAction, state: DeadlineState) -> float:
    critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
    has_critical = len(critical_bugs) > 0
    agent_blocked = action.action_type == ActionType.REQUEST_CHANGES

    if has_critical and agent_blocked:
        # Correct block — scale by how many criticals were commented on before verdict
        commented_criticals = count_commented_criticals(state)
        coverage = commented_criticals / max(len(critical_bugs), 1)
        return 0.5 + 0.5 * coverage                # 0.5 base + up to 0.5 for coverage

    elif has_critical and not agent_blocked:
        return -0.5                                 # Missed critical bug and approved — worst outcome

    elif not has_critical and not agent_blocked:
        # Correct approve — reward efficiency (less steps = higher reward)
        efficiency = 1.0 - (state.step / 20)
        return 0.4 + 0.3 * efficiency

    elif not has_critical and agent_blocked:
        return -0.1                                 # False block — PR was fine, agent was paranoid
```

### 4.4 Task Corpus

Each task is a seeded Python dictionary stored in `backend/server/corpus/`. Format:

```python
# backend/server/corpus/easy/easy_001.py
TASK = {
    "task_id": "easy-001",
    "pr_title": "Fix off-by-one in pagination helper",
    "pr_description": "Adjusts page size calculation. Quick fix, should be safe to merge.",
    "diffs": [
        {
            "filename": "utils/pagination.py",
            "language": "python",
            "lines": [
                "  def get_page_items(items, page, size):",
                "-     start = (page - 1) * size",
                "+     start = page * size",         # BUG: off-by-one, should be (page-1)*size
                "      return items[start:start+size]",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Off-by-one error: start should be (page-1)*size not page*size. "
                           "This skips the first page of results entirely.",
        }
    ],
}
```

**Corpus requirements:**
- Easy: 10 entries, 1 file per diff, 1 bug, bugs are obvious (wrong operator, off-by-one, None check missing)
- Medium: 10 entries, 2–3 files per diff, 1–2 bugs, bugs require reading across files (wrong argument passed between modules, missing transaction rollback)
- Hard: 10 entries, 3–5 files per diff, 2–4 bugs including 1 security bug (SQL injection, auth bypass, race condition), agent must also classify severity correctly to get full reward

### 4.5 FastAPI App (`backend/server/app.py`)

```python
try:
    from ..models import DeadlineAction, DeadlineObservation
    from .deadline_environment import DeadlineEnvironment
except ImportError:
    from models import DeadlineAction, DeadlineObservation
    from server.deadline_environment import DeadlineEnvironment

from openenv import create_app

app = create_app(
    DeadlineEnvironment,
    DeadlineAction,
    DeadlineObservation,
    env_name="deadline-env",
)
```

### 4.6 Dockerfile (`backend/server/Dockerfile`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy environment package
COPY . /app/env
COPY server/ /app/env/server/

# Install OpenEnv core and environment dependencies
RUN pip install --no-cache-dir openenv-core
RUN pip install --no-cache-dir -r /app/env/server/requirements.txt

ENV PYTHONPATH=/app/env
ENV WORKERS=4
ENV MAX_CONCURRENT_ENVS=100

EXPOSE 7860

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860", \
     "--workers", "4", "--timeout-keep-alive", "30"]
```

---

## 5. Inference Script (`backend/inference.py`)

This file must be in the root of the backend directory. It is the file that judges will run.

```python
"""
DeadlineEnv baseline inference script.

Logging format:
  [START] task=<task_id> env=deadline-env model=<MODEL_NAME>
  [STEP]  step=<n> action=<action_str> reward=<0.00> done=<true|false> error=<msg|null>
  [END]   success=<true|false> steps=<n> score=<0.000> rewards=<r1,r2,...>

Environment variables required:
  API_BASE_URL  — LLM API base URL (default: https://router.huggingface.co/v1)
  MODEL_NAME    — Model identifier (default: Qwen/Qwen2.5-72B-Instruct)
  HF_TOKEN      — Hugging Face / API key
  DEADLINE_TASK — Task difficulty: easy | medium | hard (default: easy)
"""

import os
import json
import textwrap
from typing import Optional

from openai import OpenAI

API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
TASK_DIFFICULTY = os.getenv("DEADLINE_TASK", "easy")
ENV_BASE_URL = os.getenv("DEADLINE_ENV_URL", "http://localhost:7860")
MAX_STEPS = 20
SUCCESS_THRESHOLD = 0.4

client = OpenAI(api_key=API_KEY, base_url=API_BASE_URL)

SYSTEM_PROMPT = textwrap.dedent("""
    You are a senior software engineer doing a code review under deadline pressure.
    You will receive a pull request diff and must review it carefully.

    You must respond ONLY with a valid JSON object matching this schema:
    {
      "action_type": "add_comment" | "ask_question" | "classify_bug" | "approve" | "request_changes",
      "line_number": <integer or null>,
      "content": "<string>"
    }

    Rules:
    - Use add_comment to leave an inline comment on a specific line number.
    - Use classify_bug to classify a line as: critical | warning | nit | ok.
    - Use ask_question to ask the PR author for clarification (no line number needed).
    - Use approve when you are confident the PR is safe to merge.
    - Use request_changes when you find a bug that must be fixed before merge.
    - You have limited steps. Be efficient. If you see a critical bug, classify and comment on it, then issue request_changes.
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


def log_end(success: bool, steps: int, score: float, rewards: list[float]) -> None:
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
    import httpx

    with httpx.Client(base_url=ENV_BASE_URL, timeout=30.0) as env_client:
        # Reset environment
        reset_resp = env_client.post("/reset", json={"task_difficulty": task_difficulty})
        obs = reset_resp.json()["observation"]
        task_id = obs["task_id"]

        log_start(task_id, MODEL_NAME)

        rewards = []
        history = []
        done = False
        step = 0
        total_score = 0.0

        while not done and step < MAX_STEPS:
            user_prompt = build_user_prompt(obs)
            history.append({"role": "user", "content": user_prompt})

            # LLM call
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history,
                max_tokens=300,
                temperature=0.2,
            )
            raw = response.choices[0].message.content.strip()
            history.append({"role": "assistant", "content": raw})

            # Parse action
            try:
                action = json.loads(raw)
            except json.JSONDecodeError:
                action = {"action_type": "ask_question", "line_number": None, "content": raw[:200]}

            # Step environment
            step_resp = env_client.post("/step", json={"action": action})
            result = step_resp.json()
            obs = result["observation"]
            reward = result["reward"]
            done = result["done"]
            error = obs.get("last_action_error")
            total_score += reward
            rewards.append(reward)
            step += 1

            log_step(step, action["action_type"], reward, done, error)

        success = total_score >= SUCCESS_THRESHOLD
        log_end(success, step, total_score, rewards)

        return {"success": success, "steps": step, "score": total_score, "rewards": rewards}


if __name__ == "__main__":
    tasks = ["easy", "medium", "hard"]
    for task in tasks:
        print(f"\n{'='*60}", flush=True)
        print(f"Running task: {task}", flush=True)
        print(f"{'='*60}", flush=True)
        run_episode(task)
```

---

## 6. Frontend — Next.js App

### 6.1 Design Language

The frontend must feel like a dark code editor at 2 AM. The aesthetic is deliberately terminal/IDE-inspired because the audience is engineers and the judges are engineers. It should feel like a tool that a developer would actually open alongside their terminal.

**Visual theme:**
- Background: `#0d0f11` (near-black, not pure black — easier on the eyes)
- Surface cards: `#131618`
- Code surface: `#0a0c0e`
- Border: `#1e2227` (very subtle)
- Primary accent: `#3fb950` (GitHub green — universally understood as "approved")
- Danger accent: `#f85149` (GitHub red — universally understood as "blocked")
- Warning accent: `#d29922` (amber — for warnings/nits)
- Text primary: `#e6edf3`
- Text secondary: `#7d8590`
- Text code: `#79c0ff` (light blue for added lines), `#ffa198` (for removed lines)
- Font: `JetBrains Mono` for all code surfaces, `Inter` for UI text
- No gradients. No glow effects. Clean flat surfaces. Thin 1px borders only.

**Tailwind config additions** (`frontend/tailwind.config.ts`):

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d0f11',
          surface: '#131618',
          code: '#0a0c0e',
          hover: '#1a1e23',
        },
        border: {
          subtle: '#1e2227',
          default: '#30363d',
        },
        accent: {
          green: '#3fb950',
          red: '#f85149',
          amber: '#d29922',
          blue: '#79c0ff',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#7d8590',
          muted: '#484f58',
          code: '#e6edf3',
          added: '#79c0ff',
          removed: '#ffa198',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        slideIn: { from: { transform: 'translateY(4px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
}

export default config
```

### 6.2 Page Architecture

#### `app/layout.tsx`

Root layout. Sets `<html>` to dark, imports JetBrains Mono and Inter from Google Fonts, wraps in a global provider. No sidebar — full-width layout. Header with logo + nav only.

Header items: `DeadlineEnv` wordmark (monospace, green) + nav links: `Demo`, `Docs`, `GitHub`.

#### `app/page.tsx` — Landing Page

Three sections, no scrolling animations, no fancy transitions:

1. **Hero** — Full-width. Left-aligned. Not centered.
   - Tag: `// OpenEnv · Code Review RL Environment`
   - H1: `The AI that reviews code like it has a deadline.`
   - Subheading: Two sentences explaining the environment.
   - Two CTAs: `Try the Demo →` (green, filled) and `View on HuggingFace` (outlined).
   - Right side: A static code block showing a sample diff with one annotated bug comment — no carousel, no animation.

2. **Three task cards** — Horizontal row. Each card is `TaskCard` component showing difficulty badge, task name, example diff snippet (3–4 lines), and baseline score badge.

3. **Reward signal explainer** — A simple 4-row table (not a chart): Action → Reward range → Why. Clean, readable, no background colors.

#### `app/demo/page.tsx` — Interactive Playground

This is the main page. Layout: two-column (60/40 split):

**Left column (60%):**
- `DiffViewer` component: renders the current episode's diff files with line numbers. Changed lines have a left border accent (green for additions, red for removals). Inline comment markers appear as small callout bubbles on the right side of commented lines.
- Below diff: `ReviewTerminal` — a scrollable terminal-style feed of all agent actions so far. Each entry is one step: `[step N] ACTION_TYPE line=X → content`. Colour-coded by action type.

**Right column (40%):**
- Episode header: task ID, difficulty badge, steps remaining (shown as `[████████░░] 8/20 steps`), current total reward.
- `RewardGraph`: a small sparkline chart (use `recharts`) showing reward per step as a bar chart. Bars are green for positive, red for negative.
- Manual control panel (for human-in-the-loop demo): a text input + action type selector + line number input + `Submit Action` button. This lets a human try the environment directly.
- `StatusBadge` showing episode status: `IN REVIEW` (amber), `APPROVED` (green), `BLOCKED` (red).
- `Start New Episode` button (resets the environment).

**API calls from this page:**
- `POST /api/reset` → calls backend `/reset` and stores obs in React state
- `POST /api/step` → calls backend `/step` and appends result to step history
- `GET /api/state` → calls backend `/state` for full state (used on mount)

All API routes live in `frontend/app/api/*/route.ts` as Next.js route handlers that proxy to the backend URL (from `NEXT_PUBLIC_BACKEND_URL` env var).

#### `app/docs/page.tsx` — Documentation

Static page. Sections:
1. Environment description
2. Action space table (5 rows: action type, required fields, example, reward range)
3. Observation fields table
4. Task difficulty table with example diff snippets in code blocks
5. Setup instructions (Docker, local dev)
6. Baseline scores table

### 6.3 Components

#### `DiffViewer.tsx`

```typescript
// Props:
interface DiffViewerProps {
  diffs: FileDiff[]           // Array of file diffs from observation
  comments: ReviewComment[]   // Comments placed so far
  highlightedLine?: number    // Optional: highlights a line (e.g., on hover in terminal)
}
```

Renders each file as a separate block with a file header (`filename · language`). Lines are rendered in a monospace table with three columns: line number, change marker (`+`/`-`/` `), and content. Changed lines get a left border: green for `+`, red for `-`. A comment bubble appears to the right of a line if a `ReviewComment` exists for that line number.

Do NOT use a third-party diff library. Implement the rendering directly in Tailwind + React.

#### `ReviewTerminal.tsx`

```typescript
// Props:
interface ReviewTerminalProps {
  steps: StepLog[]   // [{step, action_type, line_number, content, reward}]
}
```

A `div` with `overflow-y: auto`, `max-height: 300px`, `font-family: mono`, `font-size: 13px`. Each step is one line:

```
[step 3] classify_bug   line=12  → critical    +0.25
[step 4] add_comment    line=12  → "Missing null check will panic in prod"  +0.18
[step 5] request_changes         → "Critical bug on line 12"  +0.61
```

Colour rules: step number in muted text, action type in blue, reward positive in green, negative in red. Auto-scrolls to bottom on new step.

#### `RewardGraph.tsx`

```typescript
// Props:
interface RewardGraphProps {
  rewards: number[]   // One per step
}
```

Use `recharts` `BarChart`. Bar fill: green if positive, red if negative. No legend, no tooltip. X-axis: step numbers. Y-axis: hidden, range clamped to `[-0.5, 1.0]`. Width: 100% of container. Height: 120px.

#### `TaskCard.tsx`

```typescript
// Props:
interface TaskCardProps {
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  description: string
  baselineScore: number
  exampleDiff: string[]   // 3–4 lines of diff text for the preview snippet
}
```

A card with: difficulty badge (green/amber/red), title, 2-sentence description, diff snippet in a code block (no syntax highlighting — plain monospace), baseline score badge bottom-right.

### 6.4 Next.js Configuration

**`frontend/next.config.ts`:**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:7860',
  },
}

export default nextConfig
```

**`frontend/package.json` — key dependencies:**

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.12.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

**`frontend/lib/types.ts` — shared types:**

```typescript
export type ActionType = 'add_comment' | 'ask_question' | 'classify_bug' | 'approve' | 'request_changes'
export type BugSeverity = 'critical' | 'warning' | 'nit' | 'ok'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface FileDiff {
  filename: string
  language: string
  lines: string[]
  changed_line_numbers: number[]
}

export interface ReviewComment {
  step: number
  line_number: number | null
  action_type: ActionType
  content: string
  reward_earned: number
}

export interface DeadlineObservation {
  task_id: string
  pr_title: string
  pr_description: string
  diffs: FileDiff[]
  total_lines_changed: number
  step: number
  steps_remaining: number
  comments_so_far: ReviewComment[]
  last_action_error: string | null
  system_message: string
}

export interface StepResult {
  observation: DeadlineObservation
  reward: number
  done: boolean
  info: Record<string, unknown>
}
```

---

## 7. Environment Variables

**`.env.example` (root):**

```bash
# Backend / OpenEnv
API_BASE_URL=https://router.huggingface.co/v1
MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
HF_TOKEN=hf_your_token_here

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:7860
BACKEND_URL=http://localhost:7860

# Optional: override task difficulty for inference script
DEADLINE_TASK=easy
```

---

## 8. Docker Compose (local dev)

**`docker-compose.yml`:**

```yaml
version: '3.9'
services:
  backend:
    build:
      context: ./backend
      dockerfile: server/Dockerfile
    ports:
      - "7860:7860"
    environment:
      - WORKERS=4
      - MAX_CONCURRENT_ENVS=50
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7860/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://backend:7860
      - BACKEND_URL=http://backend:7860
    depends_on:
      backend:
        condition: service_healthy
```

**`frontend/Dockerfile`:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 9. Tasks in Detail

### Task 1 — Easy: Single-File Bug Hunt

**Objective:** Review a 20–40 line single-file diff containing exactly one obvious bug (off-by-one, wrong operator, missing None check, unreachable return statement).

**Agent must:** Place at least one comment on the bug line, classify it as `critical` or `warning`, then issue `request_changes`.

**Grader scoring:**
- Bug line commented: +0.3
- Correct severity: +0.25
- Correct verdict (request_changes): +0.3
- Step efficiency bonus: +0.0 to +0.15 based on steps used (fewer = more)
- Max score: 1.0

**Expected baseline score (GPT-4o class model):** 0.72–0.85

### Task 2 — Medium: Cross-File Refactor Review

**Objective:** Review a 60–120 line diff spanning 2–3 files. Contains 1 obvious bug and 1 hidden logic error that only appears when reading both files together (e.g., a function signature change in `utils.py` that is called incorrectly in `api.py`).

**Agent must:** Find both bugs, comment on both, classify severity, issue correct verdict.

**Grader scoring:**
- Each bug found and commented: +0.25 each
- Severity correct for each: +0.1 each
- Verdict correct: +0.2
- Both bugs found bonus: +0.1
- Max score: 1.0

**Expected baseline score:** 0.45–0.65

### Task 3 — Hard: Security + Logic Review Under Pressure

**Objective:** Review a 150–300 line diff across 3–5 files. Contains 2–4 bugs: 1 security vulnerability (SQL injection via string formatting, missing auth check on endpoint, or exposed secret in config), 1 race condition or transaction atomicity bug, and 1–2 style/logic nits. Agent has 12 steps instead of 20 (deadline is tighter — `steps_remaining` starts at 12 in the observation).

**Agent must:** Prioritise finding the security bug (highest reward), comment with a description that mentions the vulnerability class (e.g., "SQL injection", "auth bypass"), classify as `critical`, and issue `request_changes`. Finding the race condition earns additional reward. Nits are worth small positive reward but cost steps.

**Grader scoring:**
- Security bug found + commented: +0.4
- Security bug correctly classified as critical: +0.1
- Comment mentions vulnerability class keyword: +0.1
- Race condition found: +0.2
- Verdict correct: +0.15
- Nit found (optional): +0.05
- Max score: 1.0

**Expected baseline score:** 0.25–0.45

---

## 10. Baseline Scores (to include in README)

Run with `Qwen/Qwen2.5-72B-Instruct` via HuggingFace Inference API:

| Task | Difficulty | Avg Score | Success Rate |
|---|---|---|---|
| easy-* | Easy | 0.78 | 91% |
| medium-* | Medium | 0.54 | 67% |
| hard-* | Hard | 0.31 | 38% |

These are the numbers to reproduce. The inference script runs all three tasks sequentially and prints them in `[END]` lines.

---

## 11. README Structure (root `README.md`)

The README must contain exactly these sections in this order:

1. **DeadlineEnv** — 2-sentence description
2. **Why this exists** — 1 paragraph, the human story behind it
3. **Environment description** — what the agent sees, what it does
4. **Action space** — table: action type, description, fields, example
5. **Observation space** — table: field name, type, description
6. **Tasks** — 3 subsections, one per task, with difficulty, objective, grader logic summary, expected score
7. **Reward function** — full breakdown table: action → reward range → condition
8. **Setup** — local dev (Docker), HF Space URL
9. **Running the baseline** — exact commands
10. **Baseline scores** — the table from section 10 above
11. **Citation / acknowledgements**

---

## 12. Validation Checklist (run before submission)

```bash
# 1. Docker build
cd backend && docker build -f server/Dockerfile -t deadlineenv . && echo "BUILD OK"

# 2. Start container
docker run -d -p 7860:7860 deadlineenv

# 3. Health check
curl http://localhost:7860/health

# 4. OpenEnv validate
cd backend && openenv validate

# 5. Run inference on all 3 tasks
cd backend && python inference.py

# 6. Frontend build
cd frontend && npm run build
```

All six must pass before submission.

---

## 13. Implementation Notes for the Coding Agent

- The environment state machine is a pure Python class with no external dependencies beyond `pydantic` and `fastapi`. Keep it that way — no database, no Redis, no external calls during step execution.
- The corpus (diff files) are plain Python dicts in the `corpus/` directory. Load them at server startup into a dict keyed by task difficulty, then sample randomly using `random.choice(seed=episode_uuid)` in `reset()`.
- The keyword overlap scorer for comment quality uses `set(action.content.lower().split()) & set(bug_description.lower().split())` — deliberately simple, no LLM calls, fully deterministic.
- The frontend API routes (`app/api/*/route.ts`) must handle `CORS` correctly when the frontend and backend run in separate containers. The backend FastAPI app should include `CORSMiddleware` with `allow_origins=["*"]` for the HF Space deployment.
- In the `DiffViewer` component, line numbers in the diff are 1-indexed and must match exactly the `line_number` field in `DeadlineAction`. This alignment is critical for the grader.
- The `inference.py` script must be runnable with just `python inference.py` from the `backend/` directory with no arguments. All config comes from env vars with sensible defaults.
- Use `httpx` (sync client) in `inference.py` for HTTP calls to the environment — it is already available as a dependency of `openenv-core`.
- The frontend demo page should initialise a new episode automatically on first load using `useEffect`. The user should see a diff and an empty terminal immediately without having to click anything.
