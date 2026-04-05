# DeadlineEnv

DeadlineEnv is an OpenEnv reinforcement learning environment where an AI agent learns to review pull requests under deadline pressure — finding bugs, classifying severity, and issuing a verdict within a limited step budget.

---

## Why this exists

It is 11:47 PM. A pull request needs to merge before the 12 AM production deploy window. The diff is 600 lines. Your eyes are tired. You need to find the bug, write the comment, and make the call — approve or block. Engineers at product companies live this reality multiple times a week. The cost of missing a bug is a 3 AM rollback. The cost of blocking a correct PR is a delayed feature and an angry PM. DeadlineEnv simulates this. Every company with a software team needs this agent. No one has built it yet.

---

## Environment description

The agent receives a code diff (Python), a PR title, and a PR description. It must review the PR by taking structured actions across multiple turns — adding inline comments, asking clarifying questions, classifying bugs by severity, and finally issuing a verdict (approve or request-changes). The reward signal is shaped across the full episode, rewarding bug detection accuracy, comment quality, review efficiency, and penalising missed critical bugs and spurious noise.

The environment resets by sampling a random task from the seeded corpus. Episode reproducibility is guaranteed via a UUID-seeded RNG.

---

## Action space

| action_type | Description | Required fields | Example |
|---|---|---|---|
| `add_comment` | Leave an inline comment on a specific line | `line_number`, `content` | `{"action_type": "add_comment", "line_number": 3, "content": "Off-by-one here"}` |
| `classify_bug` | Label a line: critical \| warning \| nit \| ok | `line_number`, `content` | `{"action_type": "classify_bug", "line_number": 3, "content": "critical"}` |
| `ask_question` | Ask the PR author a clarifying question | `content` | `{"action_type": "ask_question", "line_number": null, "content": "Is this intentional?"}` |
| `approve` | Approve the PR — episode ends | `content` | `{"action_type": "approve", "line_number": null, "content": "LGTM"}` |
| `request_changes` | Block the PR — episode ends | `content` | `{"action_type": "request_changes", "line_number": null, "content": "Critical bug on line 3"}` |

---

## Observation space

| Field | Type | Description |
|---|---|---|
| `task_id` | string | E.g. `"easy-001"`, `"hard-007"` |
| `pr_title` | string | Pull request title |
| `pr_description` | string | PR body text |
| `diffs` | `FileDiff[]` | Array of file diffs with `lines` and `changed_line_numbers` |
| `total_lines_changed` | int | Total changed lines across all files |
| `step` | int | Current step (0-indexed) |
| `steps_remaining` | int | Steps left before forced termination |
| `comments_so_far` | `ReviewComment[]` | All actions taken with their earned rewards |
| `last_action_error` | `string \| null` | Non-null if the last action was invalid |
| `system_message` | string | Urgency nudge (e.g. `"⚠️ 3 steps left. Deadline imminent."`) |

---

## Tasks

### Task 1 — Easy: Single-File Bug Hunt

**Objective:** Review a 20–40 line single-file diff containing exactly one obvious bug (off-by-one, wrong operator, missing None check, mutable default argument).

**Agent must:** Place at least one comment on the bug line, classify it correctly, then issue `request_changes`.

**Grader scoring:**
- Bug line commented: +0.3 × keyword overlap
- High-quality comment (overlap > 60%): +0.2 bonus
- Correct severity: +0.25
- Correct verdict: +0.5 to +0.7
- Step penalty: −0.02 per step

**Expected baseline score (Qwen2.5-72B):** 0.78 avg — 91% success rate

---

### Task 2 — Medium: Cross-File Refactor Review

**Objective:** Review a 60–120 line diff spanning 2–3 files. Contains 1 obvious bug and 1 hidden cross-file logic error that only appears when reading both files together (e.g. a function signature change called incorrectly in a second file).

**Agent must:** Find both bugs across files, comment on each, classify severity, issue correct verdict.

**Grader scoring:**
- Each bug found and commented: +0.25
- Correct severity per bug: +0.1
- Correct verdict: +0.2
- Both-bugs-found bonus: +0.1

**Expected baseline score:** 0.54 avg — 67% success rate

---

### Task 3 — Hard: Security + Logic Review Under Pressure

**Objective:** Review a 150–300 line diff across 3–5 files. Contains 2–4 bugs: a security vulnerability (SQL injection, auth bypass, SSRF, command injection, deserialization RCE), a race condition or atomicity bug, and 1–2 style nits. Agent has **12 steps** instead of 20.

**Agent must:** Prioritise the security bug (highest reward), comment with the vulnerability class keyword (e.g. "sql injection", "race condition"), classify as `critical`, and issue `request_changes`. Finding the race condition earns additional reward.

**Grader scoring:**
- Security bug found + commented: +0.4
- Security bug classified critical: +0.1
- Comment mentions vulnerability keyword: +0.1
- Race condition found: +0.2
- Correct verdict: +0.15

**Expected baseline score:** 0.31 avg — 38% success rate

---

## Reward function

| Action | Reward range | Condition |
|---|---|---|
| `add_comment` on bug line | +0.0 to +0.5 | 0.3 × keyword overlap + 0.2 bonus if overlap > 60% |
| `add_comment` on clean line | −0.05 | Noise penalty |
| `classify_bug` correct severity | +0.25 | Exact match |
| `classify_bug` off by one level | +0.10 | Adjacent severity |
| `classify_bug` wrong line | −0.05 | Misclassification of clean line |
| `ask_question` | +0.05 | Always positive |
| `request_changes` (has critical bug) | +0.5 to +1.0 | Base 0.5 + 0.5 × fraction of criticals commented |
| `approve` (no critical bugs) | +0.4 to +0.7 | Base 0.4 + 0.3 × step efficiency |
| `approve` (has critical bug) | −0.50 | Missed a ship-blocker |
| `request_changes` (no critical bugs) | −0.10 | False positive block |
| Every step | −0.02 | Urgency penalty |

---

## Setup

### Docker (recommended)

```bash
git clone <repo-url>
cd deadlineenv
cp .env.example .env
# Edit .env with your HF_TOKEN
docker compose up
```

Backend: `http://localhost:7860` · Frontend: `http://localhost:3000`

### Local dev

```bash
# Backend
cd backend
pip install -r server/requirements.txt
uvicorn server.app:app --host 0.0.0.0 --port 7860

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Running the baseline

```bash
# Build and start the backend container
cd backend
docker build -f server/Dockerfile -t deadlineenv .
docker run -d -p 7860:7860 deadlineenv

# Wait for startup
sleep 10
curl http://localhost:7860/health

# Run inference on all 3 tasks
export HF_TOKEN=hf_your_token_here
export API_BASE_URL=https://router.huggingface.co/v1
export MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
python inference.py
```

---

## Baseline scores

Run with `Qwen/Qwen2.5-72B-Instruct` via HuggingFace Inference API:

| Task | Difficulty | Avg Score | Success Rate |
|---|---|---|---|
| easy-* | Easy | 0.78 | 91% |
| medium-* | Medium | 0.54 | 67% |
| hard-* | Hard | 0.31 | 38% |

---

## Citation / Acknowledgements

Built for the OpenEnv Hackathon. Environment design inspired by the daily reality of on-call engineers reviewing code under deadline pressure. Corpus diffs are synthetic but semantically realistic — each represents a class of bug that has caused real production incidents.

OpenEnv: [huggingface.co/open-env](https://huggingface.co/open-env)
