# DEADLINEENV — REMOVE ALL DEMO MODE. REAL IMPLEMENTATION ONLY.
# Audit every file. Fix every fake. Replace every mock. No exceptions.

---

## YOUR TASK

The current DeadlineEnv codebase is running in demo mode. This means it contains mocks, 
hardcoded responses, placeholder data, simulated graders, or fake frontend API calls. 
You must find and destroy every single one of them and replace them with real, working code.

This is not a UI polish task. This is a correctness audit + real implementation task.

Do not skip any file. Do not leave any TODO. Do not add any new mocks or fallbacks.

---

## AUDIT INSTRUCTIONS — CHECK EVERY FILE LISTED BELOW

For each file, open it, read every line, and look for the patterns in the DEMO MODE 
DETECTION LIST. If you find any, fix them immediately before moving on.

### DEMO MODE DETECTION LIST — search for ALL of these patterns:

```
# TODO
# FIXME  
# placeholder
# mock
# demo
# fake
# hardcoded
# fallback
# stub
# simulated
# not implemented
return {}
return []
return 0.0    ← when inside a grader or reward function
return None   ← when inside reset() or step()
return True   ← when inside a grader without real logic
pass
raise NotImplementedError
"dummy"
"example"
"test data"
"placeholder"
time.sleep()  ← fake processing delay
random.random()  ← fake score without real computation
```

Also check for these frontend demo patterns:
```javascript
// mock
// fake  
// demo
const mockData = 
const fakeObs =
const demoReward =
setTimeout(() => // fake async
Math.random()  // fake reward
[{...}]  // hardcoded observation arrays
fetch('/api/mock
```

---

## FILE-BY-FILE REAL IMPLEMENTATION REQUIREMENTS

---

### FILE 1: `backend/server/deadline_environment.py`

**Open this file. Verify every method is real.**

#### `reset(task_difficulty)` — MUST:
- Load corpus from `backend/server/corpus/{difficulty}/` by importing each `*.py` file 
  using `importlib.util.spec_from_file_location`
- Use `random.Random(episode_id).choice(corpus_list)` — seeded with the UUID for reproducibility
- Return a fully populated `DeadlineObservation` object — not a dict, not a stub
- Set `self._max_steps` from `task.get("max_steps_override", 20)`
- If corpus folder is empty or missing: RAISE a proper error, do not return fake data

#### `step(action)` — MUST:
- Call `self._validate_action(action)` and return error in observation if invalid
- Call `self._compute_step_reward(action, state)` — the REAL reward function
- Append a real `ReviewComment` to `state.comments_so_far`
- Check `action.action_type in (APPROVE, REQUEST_CHANGES)` and set `state.done = True`
- Check `state.step >= self._max_steps` and set `state.done = True`
- Return tuple `(DeadlineObservation, float, bool, dict)` — all 4 values, all real

#### `_compute_step_reward(action, state)` — MUST:
- Implement the FULL reward logic below. No shortcuts. No `return 0.0`.

```python
def _compute_step_reward(self, action, state):
    reward = 0.0
    ground_truth_lines = {b["line"] for b in state.ground_truth_bugs}

    if action.action_type == ActionType.ADD_COMMENT:
        if action.line_number in ground_truth_lines:
            bug = self._get_bug_at_line(action.line_number)
            overlap = keyword_overlap(action.content, bug["description"])
            reward += 0.3 * overlap
            if overlap > 0.6:
                reward += 0.2
        else:
            reward -= 0.05

    elif action.action_type == ActionType.CLASSIFY_BUG:
        if action.line_number in ground_truth_lines:
            bug = self._get_bug_at_line(action.line_number)
            if action.content == bug["severity"]:
                reward += 0.25
            elif severity_adjacent(action.content, bug["severity"]):
                reward += 0.1
        else:
            reward -= 0.05

    elif action.action_type == ActionType.ASK_QUESTION:
        reward += 0.05

    elif action.action_type in (ActionType.APPROVE, ActionType.REQUEST_CHANGES):
        critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
        has_critical = len(critical_bugs) > 0
        agent_blocked = action.action_type == ActionType.REQUEST_CHANGES

        if has_critical and agent_blocked:
            commented_criticals = self._count_commented_criticals()
            coverage = commented_criticals / max(len(critical_bugs), 1)
            reward += 0.5 + 0.5 * coverage
        elif has_critical and not agent_blocked:
            reward -= 0.5
        elif not has_critical and not agent_blocked:
            efficiency = 1.0 - (state.step / self._max_steps)
            reward += 0.4 + 0.3 * efficiency
        elif not has_critical and agent_blocked:
            reward -= 0.1

    reward -= 0.02  # step penalty — urgency signal
    return round(reward, 4)
```

#### `keyword_overlap(comment, bug_description)` — MUST be real bag-of-words:
```python
def keyword_overlap(comment: str, bug_description: str) -> float:
    stop = {"the", "a", "an", "is", "in", "on", "of", "to", "and", "or", 
            "it", "this", "that", "be", "by", "for", "with", "as", "at"}
    c_words = set(comment.lower().split()) - stop
    b_words = set(bug_description.lower().split()) - stop
    if not b_words:
        return 0.0
    return len(c_words & b_words) / len(b_words)
```

#### `severity_adjacent(given, correct)` — MUST be real:
```python
def severity_adjacent(given: str, correct: str) -> bool:
    order = ["nit", "ok", "warning", "critical"]
    if given not in order or correct not in order:
        return False
    return abs(order.index(given) - order.index(correct)) == 1
```

#### `_count_commented_criticals()` — MUST be real:
```python
def _count_commented_criticals(self) -> int:
    critical_lines = {b["line"] for b in self._state.ground_truth_bugs 
                      if b["severity"] == "critical"}
    commented_lines = {c.line_number for c in self._state.comments_so_far 
                       if c.line_number is not None}
    return len(critical_lines & commented_lines)
```

---

### FILE 2: `backend/server/graders/comment_grader.py`

**MUST compute a real score. Must not return a hardcoded float.**

```python
from server.deadline_environment import keyword_overlap

def grade_comments(state) -> float:
    """What fraction of ground truth bugs have a relevant comment (overlap > 0.3)?"""
    if not state.ground_truth_bugs:
        return 1.0
    found = 0
    for bug in state.ground_truth_bugs:
        for comment in state.comments_so_far:
            if (comment.line_number == bug["line"] 
                    and comment.action_type.value == "add_comment"):
                if keyword_overlap(comment.content, bug["description"]) > 0.3:
                    found += 1
                    break
    return round(found / len(state.ground_truth_bugs), 4)
```

---

### FILE 3: `backend/server/graders/verdict_grader.py`

**MUST check real state — no hardcoded True/False.**

```python
def grade_verdict(state) -> float:
    critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
    has_critical = len(critical_bugs) > 0

    if state.verdict is None:
        return 0.0  # timed out without verdict

    agent_blocked = state.verdict == "request_changes"

    if has_critical and agent_blocked:
        return 1.0
    elif has_critical and not agent_blocked:
        return 0.0
    elif not has_critical and not agent_blocked:
        return 1.0
    else:
        return 0.3
```

---

### FILE 4: `backend/server/graders/severity_grader.py`

**MUST loop over real classify_bug actions and compare to ground truth.**

```python
def grade_severity(state) -> float:
    classify_actions = [
        c for c in state.comments_so_far 
        if c.action_type.value == "classify_bug"
    ]
    if not classify_actions:
        return 0.0
    correct = 0
    for action in classify_actions:
        for bug in state.ground_truth_bugs:
            if bug["line"] == action.line_number:
                if action.content == bug["severity"]:
                    correct += 1
                break
    return round(correct / len(classify_actions), 4)
```

---

### FILE 5: `backend/server/app.py`

**MUST expose real endpoints that call the real DeadlineEnvironment.**

Check that:
- `/reset` calls `_env.reset(task_difficulty=...)` and returns `obs.model_dump()`
- `/step` calls `_env.step(action)` and returns `{observation, reward, done, info}`
- `/state` calls `_env.state()` and returns `s.model_dump()`
- `/health` returns `{"status": "ok"}`
- `CORSMiddleware` is present with `allow_origins=["*"]`
- The app does NOT return any hardcoded observation dict
- The app does NOT have any `if demo_mode:` branch

Full correct `/reset` handler:
```python
@app.post("/reset")
def reset(req: ResetRequest):
    obs = _env.reset(task_difficulty=req.task_difficulty or "easy")
    return {"observation": obs.model_dump()}
```

Full correct `/step` handler:
```python
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
```

---

### FILE 6: `backend/inference.py`

**This is what judges run. It MUST be real. Zero fallbacks.**

Check every line for:

#### LLM call — MUST use real OpenAI client:
```python
from openai import OpenAI
client = OpenAI(api_key=API_KEY, base_url=API_BASE_URL)
```

The API call MUST be:
```python
response = client.chat.completions.create(
    model=MODEL_NAME,
    messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history[-8:],
    max_tokens=300,
    temperature=0.2,
)
raw = response.choices[0].message.content.strip()
```

**NOT any of these (remove immediately if found):**
```python
# WRONG — these are all demo/mock patterns:
raw = '{"action_type": "approve", "line_number": null, "content": "demo"}'
raw = json.dumps({"action_type": "ask_question", ...})  # hardcoded fallback as main path
response = {"choices": [{"message": {"content": "..."}}]}  # fake response dict
time.sleep(1)  # fake latency
```

#### Environment calls — MUST use real httpx:
```python
import httpx
with httpx.Client(base_url=ENV_BASE_URL, timeout=60.0) as env_client:
    reset_resp = env_client.post("/reset", json={"task_difficulty": task_difficulty})
    reset_resp.raise_for_status()
    obs = reset_resp.json()["observation"]
```

**NOT:**
```python
obs = {"task_id": "easy-001", "diffs": [], ...}  # hardcoded observation
```

#### Log format — MUST be exact (judges parse this):
```python
def log_start(task: str, model: str) -> None:
    print(f"[START] task={task} env=deadline-env model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error) -> None:
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
```

**No extra fields. No missing fields. Exact format.**

#### The main loop MUST run all 3 tasks:
```python
if __name__ == "__main__":
    for task in ["easy", "medium", "hard"]:
        run_episode(task)
```

---

### FILE 7: `backend/server/corpus/` — ALL 30 FILES

**Open every corpus file. Verify each one is real.**

Each file MUST have:
- `TASK` dict at module level
- `task_id`: string like `"easy-001"`
- `pr_title`: a real PR title (not "Test PR" or "Example")
- `pr_description`: a real description (not "description here")
- `diffs`: list of real FileDiff dicts with real Python/JavaScript code in `lines[]`
- `changed_line_numbers`: list of 1-indexed integers that match actual bug positions in `lines`
- `ground_truth_bugs`: list of dicts with `line`, `severity`, `description` — all real

**line_number alignment rule** (most common source of broken graders):
The `line` value in `ground_truth_bugs` must equal the 1-indexed position of the bug line 
in the `lines[]` array of the diff.

Example verification — if `lines` is:
```python
"lines": [
    "def get_page_slice(items, page, page_size):",   # line 1
    "    start = page * page_size",                  # line 2  ← BUG HERE
    "    return items[start:start+page_size]",        # line 3
]
```
Then `ground_truth_bugs` must have `"line": 2` — not 3, not 0.

**Hard corpus specific requirements:**
- Every hard_*.py file MUST have `"max_steps_override": 12`
- Every hard_*.py file MUST have at least 1 bug with `"severity": "critical"`
- That critical bug's description MUST contain at least one of these exact phrases:
  `sql injection`, `auth bypass`, `race condition`, `exposed secret`, `missing auth`,
  `missing authentication`, `command injection`, `path traversal`, `ssrf`, `xss`

**Fix any corpus file that has:**
- `"lines": []` (empty diff)
- `"ground_truth_bugs": []` (no bugs — impossible to score)
- `"description": "bug here"` or any other placeholder
- lines that are not valid Python/JavaScript code syntax
- `changed_line_numbers` that don't match actual bug positions

---

### FILE 8: `frontend/app/demo/page.tsx`

**This is the most likely source of demo mode. Audit every fetch call.**

The page MUST call the real backend. Not mock data. Not local state initialized with fake obs.

#### `useEffect` on mount — MUST call real reset:
```typescript
useEffect(() => {
  fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_difficulty: 'easy' }),
  })
    .then(r => r.json())
    .then(data => setObs(data.observation))
    .catch(console.error)
}, [])
```

**NOT:**
```typescript
// WRONG — all demo patterns:
setObs(MOCK_OBSERVATION)
setObs({ task_id: 'easy-001', diffs: [...hardcoded...] })
const obs = getDemoObservation()
```

#### Submit action handler — MUST call real step endpoint:
```typescript
const handleSubmit = async () => {
  const res = await fetch('/api/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: { action_type, line_number, content } }),
  })
  const data = await res.json()
  setObs(data.observation)
  setRewards(prev => [...prev, data.reward])
  setDone(data.done)
}
```

**NOT:**
```typescript
setRewards(prev => [...prev, Math.random()])  // fake reward
setObs(computeFakeNextObs(action))            // local simulation
```

#### Start New Episode — MUST call real reset:
```typescript
const handleNewEpisode = async () => {
  const res = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_difficulty: selectedDifficulty }),
  })
  const data = await res.json()
  setObs(data.observation)
  setRewards([])
  setSteps([])
  setDone(false)
}
```

---

### FILE 9: `frontend/app/api/reset/route.ts`

**MUST proxy to real backend. Must not return hardcoded data.**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7860'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND_URL}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
```

**NOT:**
```typescript
return NextResponse.json({ observation: MOCK_OBSERVATION })
return NextResponse.json({ observation: { task_id: 'demo', diffs: [] } })
```

---

### FILE 10: `frontend/app/api/step/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7860'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND_URL}/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
```

---

### FILE 11: `frontend/app/api/state/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7860'

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/state`)
  const data = await res.json()
  return NextResponse.json(data)
}
```

---

### FILE 12: `frontend/components/DiffViewer.tsx`

**MUST render real diffs from props. Must not render hardcoded diff content.**

The component receives `diffs: FileDiff[]` as props from the real observation.
It must render `diffs.map(diff => ...)` — not a hardcoded example diff.

Check that line number alignment is correct: `lines[i]` is displayed with line number `i + 1` (1-indexed).

Check that `changed_line_numbers` is used to apply the green/red border styling — the value from the real FileDiff prop, not a hardcoded set.

Check that `comments` prop (ReviewComment[]) is used to render callout bubbles — matching `comment.line_number` to the rendered line, not a hardcoded comment position.

---

### FILE 13: `frontend/components/RewardGraph.tsx`

**MUST render `rewards` prop values. Must not render fake reward arrays.**

```typescript
interface RewardGraphProps {
  rewards: number[]  // from real step results, not Math.random()
}
```

The `rewards` array comes from real `/step` API calls. Each `data.reward` from a real step 
gets appended. The graph renders this real array.

Check there is no:
```typescript
const fakeRewards = [0.1, -0.02, 0.28, ...]
const rewards = demo ? fakeRewards : props.rewards
```

---

## ENVIRONMENT VARIABLES — VERIFY THESE ARE SET

After fixing all files, confirm these exist in the running environment:

**Backend (`.env` in root or `backend/.env`):**
```bash
API_BASE_URL=https://router.huggingface.co/v1
MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
HF_TOKEN=<real token — NOT "hf_your_token_here" or empty>
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:7860
BACKEND_URL=http://localhost:7860
```

If `HF_TOKEN` is not set or is a placeholder string, the inference script will fail 
silently or return 401 errors. The token must be a real active HuggingFace token.

---

## INTEGRATION TEST — RUN THESE 7 COMMANDS IN ORDER

After fixing all files, run this sequence. Every command must succeed before moving on.

### Test 1 — Backend starts clean:
```bash
cd backend
python -m uvicorn server.app:app --host 0.0.0.0 --port 7860 --reload
# Should print: Application startup complete.
# Should NOT print: ImportError, ModuleNotFoundError, AttributeError
```

### Test 2 — Health check:
```bash
curl -s http://localhost:7860/health
# Expected: {"status":"ok"}
```

### Test 3 — Real reset returns real corpus data:
```bash
curl -s -X POST http://localhost:7860/reset \
  -H "Content-Type: application/json" \
  -d '{"task_difficulty": "easy"}' | python3 -m json.tool

# Check output:
# - observation.task_id should be "easy-001" through "easy-010" (random)
# - observation.diffs should have at least 1 file with non-empty lines[]
# - observation.steps_remaining should be 20
# - observation.pr_title should NOT be "Test PR" or "Example"
```

### Test 4 — Real step computes real reward:
```bash
# First reset to easy
curl -s -X POST http://localhost:7860/reset \
  -H "Content-Type: application/json" \
  -d '{"task_difficulty": "easy"}' > /dev/null

# Then step with a comment on the bug line (line 3 for easy-001)
curl -s -X POST http://localhost:7860/step \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "action_type": "add_comment",
      "line_number": 3,
      "content": "off by one error here start should be page minus one times page_size"
    }
  }' | python3 -m json.tool

# Check output:
# - reward should be a non-zero float (e.g., 0.12 to 0.48 depending on overlap)
# - reward should NOT be 0.0 unless comment has zero keyword overlap
# - reward should NOT be exactly -0.02 (that would mean line 3 is not a bug line)
# - observation.step should be 1
# - observation.steps_remaining should be 19
```

### Test 5 — Hard task uses 12 steps:
```bash
curl -s -X POST http://localhost:7860/reset \
  -H "Content-Type: application/json" \
  -d '{"task_difficulty": "hard"}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
obs = data['observation']
print('steps_remaining:', obs['steps_remaining'])
assert obs['steps_remaining'] == 12, f'Expected 12, got {obs[\"steps_remaining\"]}'
print('PASS: hard task starts with 12 steps')
"
```

### Test 6 — Frontend loads real data (not mock):
```bash
# Start frontend: cd frontend && npm run dev
# Open http://localhost:3000/demo in browser
# Open DevTools → Network tab
# Reload page
# You should see:
#   POST /api/reset → 200 → response body has real observation with real diffs
# You should NOT see:
#   No network calls to /api/reset on load (would mean mock data)
#   POST /api/reset → 200 → response with empty diffs: []
```

### Test 7 — Real inference end-to-end:
```bash
cd backend
export HF_TOKEN=hf_your_real_token_here
export API_BASE_URL=https://router.huggingface.co/v1
export MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
export DEADLINE_ENV_URL=http://localhost:7860
python inference.py

# Expected output format (exact):
# ============================================================
# Running task: easy
# ============================================================
# [START] task=easy-00X env=deadline-env model=Qwen/Qwen2.5-72B-Instruct
# [STEP] step=1 action=add_comment reward=0.18 done=false error=null
# [STEP] step=2 action=classify_bug reward=0.23 done=false error=null
# ...
# [END] success=true steps=4 score=0.620 rewards=0.18,0.23,...
#
# Check:
# - rewards are non-zero non-uniform floats (not all 0.00)
# - [END] success field is true or false (not always same value)
# - [END] score is computed from actual rewards (not hardcoded 0.780)
# - All 3 tasks run (easy, medium, hard)
```

---

## COMMON BUGS TO FIX (most frequent demo mode issues)

### Bug A — Corpus not loaded, hardcoded task used in reset():
**Symptom:** Every reset returns the exact same task_id ("easy-001" always)
**Fix:** Implement `_load_corpus()` properly using `importlib.util` and use 
`random.Random(episode_id).choice(corpus_list)` to sample.

### Bug B — Reward always returns -0.02 (only the step penalty):
**Symptom:** Every [STEP] line shows `reward=-0.02`
**Fix:** The bug line lookup is broken. The `action.line_number` is not matching 
`ground_truth_lines` because the corpus `line` values are wrong (0-indexed instead of 1-indexed,
or pointing to wrong line). Fix corpus line numbers to be 1-indexed positions in `lines[]`.

### Bug C — Frontend shows same diff every time regardless of backend:
**Symptom:** Demo page shows the same hardcoded diff on every load
**Fix:** Remove hardcoded `MOCK_OBSERVATION` constant. The `useEffect` on mount must call 
`/api/reset` and set the returned `observation` into React state. `DiffViewer` must render 
`obs.diffs` from that state — not a static imported constant.

### Bug D — inference.py runs but scores are all exactly 0.000:
**Symptom:** `[END] success=false steps=20 score=0.000 rewards=0.00,0.00,...`
**Fix 1:** The LLM is not being called (API key not working). Check HF_TOKEN is valid.
**Fix 2:** The step endpoint returns reward=0.0 because grader is stubbed. Fix the 
`_compute_step_reward` to use real keyword_overlap logic.
**Fix 3:** The action parsed from LLM is wrong format. Add debug print of `raw` to see 
what the LLM returns, ensure JSON is being parsed correctly.

### Bug E — openenv validate fails with "invalid spec":
**Symptom:** `openenv validate` errors on missing field
**Fix:** Ensure `openenv.yaml` has all required fields: `spec_version`, `name`, `type`, 
`runtime`, `app`, `port`. The `app` field must point to a real importable module path.

### Bug F — Docker build succeeds but container fails to start:
**Symptom:** Container exits immediately after `docker run`
**Fix 1:** `PYTHONPATH` not set — add `ENV PYTHONPATH=/app` to Dockerfile
**Fix 2:** Corpus `.py` files not copied into image — ensure `COPY . /app/` includes corpus/
**Fix 3:** Import error on startup — run `docker logs <container_id>` to see the traceback

---

## AFTER ALL FIXES — FINAL CHECKLIST

Run through this list top to bottom. Every item must be TRUE:

- [ ] `curl http://localhost:7860/health` returns `{"status":"ok"}`
- [ ] `POST /reset` with `easy` returns observation with non-empty `diffs` and real `pr_title`  
- [ ] `POST /reset` called 3 times returns 3 different `task_id` values (random sampling works)
- [ ] `POST /step` with a comment on the bug line returns `reward > 0.0` (not -0.02 only)
- [ ] `POST /step` with approve on a task with critical bugs returns `reward < 0.0`
- [ ] `POST /reset` with `hard` returns `steps_remaining == 12`
- [ ] Frontend `/demo` page shows a real diff loaded from backend on page load
- [ ] Frontend Submit Action button calls `/api/step` and updates the reward graph
- [ ] Frontend Start New Episode calls `/api/reset` and shows a new (possibly different) diff
- [ ] `python inference.py` completes all 3 tasks with non-zero, non-uniform rewards
- [ ] `python inference.py` output contains `[START]`, `[STEP]`, and `[END]` lines in exact format
- [ ] `docker build -f server/Dockerfile -t deadlineenv .` succeeds
- [ ] `docker run -p 7860:7860 deadlineenv` starts and responds to `/health` within 30 seconds
- [ ] No file in the codebase contains the words: mock, demo, placeholder, stub, TODO, fake, hardcoded

Do not submit until every checkbox is checked.
