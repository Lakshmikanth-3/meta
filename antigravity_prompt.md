# ANTIGRAVITY IMPLEMENTATION PROMPT — DeadlineEnv
# Code Review RL Environment for OpenEnv Hackathon
# Zero mocks. Zero placeholders. Zero hardcoded shortcuts. Full production implementation.

---

## MISSION

Build a complete, production-ready OpenEnv RL environment called **DeadlineEnv** that lets an AI agent learn to review pull requests. Every file must be real, complete, and runnable. No TODO comments. No placeholder data. No simulated responses. No fallback paths that fake behaviour.

---

## PROJECT STRUCTURE — CREATE EVERY FILE LISTED

```
deadlineenv/
├── backend/
│   ├── __init__.py
│   ├── models.py
│   ├── client.py
│   ├── openenv.yaml
│   ├── pyproject.toml
│   ├── inference.py                    ← judges run this
│   ├── README.md
│   └── server/
│       ├── __init__.py
│       ├── app.py
│       ├── deadline_environment.py
│       ├── requirements.txt
│       ├── Dockerfile
│       ├── tasks/
│       │   ├── __init__.py
│       │   ├── task_easy.py
│       │   ├── task_medium.py
│       │   └── task_hard.py
│       ├── graders/
│       │   ├── __init__.py
│       │   ├── comment_grader.py
│       │   ├── verdict_grader.py
│       │   └── severity_grader.py
│       └── corpus/
│           ├── easy/
│           │   ├── easy_001.py  through easy_010.py   ← 10 real diffs
│           ├── medium/
│           │   ├── medium_001.py through medium_010.py ← 10 real diffs
│           └── hard/
│               ├── hard_001.py through hard_010.py    ← 10 real diffs
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── demo/
│   │   │   └── page.tsx
│   │   ├── docs/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── reset/
│   │       │   └── route.ts
│   │       ├── step/
│   │       │   └── route.ts
│   │       └── state/
│   │           └── route.ts
│   ├── components/
│   │   ├── DiffViewer.tsx
│   │   ├── ReviewTerminal.tsx
│   │   ├── RewardGraph.tsx
│   │   ├── TaskCard.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── Dockerfile
│   └── package.json
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## STEP 1 — BACKEND: PYDANTIC MODELS (`backend/models.py`)

```python
from __future__ import annotations
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    ADD_COMMENT = "add_comment"
    ASK_QUESTION = "ask_question"
    CLASSIFY_BUG = "classify_bug"
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"


class BugSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    NIT = "nit"
    OK = "ok"


class DeadlineAction(BaseModel):
    action_type: ActionType = Field(..., description="Which review action to take")
    line_number: Optional[int] = Field(None, description="Target line in the diff (1-indexed)")
    content: str = Field(..., description="Text of comment / severity label / verdict justification")


class FileDiff(BaseModel):
    filename: str
    language: str
    lines: list[str]
    changed_line_numbers: list[int]


class ReviewComment(BaseModel):
    step: int
    line_number: Optional[int]
    action_type: ActionType
    content: str
    reward_earned: float


class DeadlineObservation(BaseModel):
    task_id: str
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]
    total_lines_changed: int
    step: int
    steps_remaining: int
    comments_so_far: list[ReviewComment]
    last_action_error: Optional[str]
    system_message: str


class DeadlineState(BaseModel):
    task_id: str
    task_difficulty: Literal["easy", "medium", "hard"]
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]
    ground_truth_bugs: list[dict]
    comments_so_far: list[ReviewComment]
    verdict: Optional[str]
    step: int
    done: bool
    total_reward: float
    episode_id: str
```

---

## STEP 2 — CORPUS: REAL DIFFS (ALL 30 FILES)

### EASY CORPUS RULES:
- 1 file per diff, 20–40 lines, exactly 1 bug
- Bug types: off-by-one, wrong operator (< vs <=, + vs -), missing None/null check, wrong return value, wrong variable used
- Ground truth must have line number matching the actual changed line in `lines[]` (1-indexed)
- `changed_line_numbers` must list the index of the bug line

### Create `backend/server/corpus/easy/easy_001.py`:
```python
TASK = {
    "task_id": "easy-001",
    "pr_title": "Fix pagination offset calculation",
    "pr_description": "Adjusts page offset. Quick one-liner fix.",
    "diffs": [
        {
            "filename": "utils/pagination.py",
            "language": "python",
            "lines": [
                "def get_page_slice(items, page, page_size):",
                "    \"\"\"Return the slice of items for the given page (1-indexed).\"\"\"",
                "    start = page * page_size",   # BUG: should be (page - 1) * page_size
                "    end = start + page_size",
                "    return items[start:end]",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Off-by-one: start should be (page - 1) * page_size. Using page * page_size skips the first page entirely.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_002.py`:
```python
TASK = {
    "task_id": "easy-002",
    "pr_title": "Add retry logic to HTTP client",
    "pr_description": "Wraps request call in retry loop for transient errors.",
    "diffs": [
        {
            "filename": "http_client.py",
            "language": "python",
            "lines": [
                "def fetch_with_retry(url, max_retries=3):",
                "    for attempt in range(max_retries):",
                "        try:",
                "            response = requests.get(url, timeout=5)",
                "            if response.status_code == 200:",
                "                return response.json()",
                "        except requests.RequestException:",
                "            if attempt == max_retries:",   # BUG: should be max_retries - 1
                "                raise",
                "    return None",
            ],
            "changed_line_numbers": [8],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 8,
            "severity": "warning",
            "description": "Wrong comparison: attempt == max_retries is never true because range(max_retries) goes 0..max_retries-1. Should be attempt == max_retries - 1.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_003.py`:
```python
TASK = {
    "task_id": "easy-003",
    "pr_title": "Implement binary search helper",
    "pr_description": "Utility binary search for sorted lists.",
    "diffs": [
        {
            "filename": "utils/search.py",
            "language": "python",
            "lines": [
                "def binary_search(arr, target):",
                "    lo, hi = 0, len(arr)",   # BUG: hi should be len(arr) - 1
                "    while lo <= hi:",
                "        mid = (lo + hi) // 2",
                "        if arr[mid] == target:",
                "            return mid",
                "        elif arr[mid] < target:",
                "            lo = mid + 1",
                "        else:",
                "            hi = mid - 1",
                "    return -1",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "critical",
            "description": "Off-by-one in upper bound: hi should be len(arr) - 1 to avoid index out of range on arr[mid].",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_004.py`:
```python
TASK = {
    "task_id": "easy-004",
    "pr_title": "Add user role check to admin endpoint",
    "pr_description": "Guards the /admin route with a role check.",
    "diffs": [
        {
            "filename": "routes/admin.py",
            "language": "python",
            "lines": [
                "def admin_dashboard(request):",
                "    user = get_current_user(request)",
                "    if user.role != 'admin':",   # BUG: != should be == (logic is inverted)
                "        return render_admin_page(user)",
                "    raise PermissionError('Admins only')",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Inverted condition: the guard blocks admins and lets non-admins through. Should be `if user.role == 'admin'` to allow, not deny.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_005.py`:
```python
TASK = {
    "task_id": "easy-005",
    "pr_title": "Fix divide-by-zero in average calculator",
    "pr_description": "Calculates average of a list. Simple utility.",
    "diffs": [
        {
            "filename": "stats.py",
            "language": "python",
            "lines": [
                "def compute_average(values):",
                "    total = sum(values)",
                "    return total / len(values)",   # BUG: no check for empty list
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Missing empty list check. If values is [], len(values) is 0, causing ZeroDivisionError at runtime.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_006.py`:
```python
TASK = {
    "task_id": "easy-006",
    "pr_title": "Update loop to use inclusive upper bound",
    "pr_description": "Range fix for inclusive day counting.",
    "diffs": [
        {
            "filename": "scheduler.py",
            "language": "python",
            "lines": [
                "def count_business_days(start, end):",
                "    count = 0",
                "    for day in range(start, end):",   # BUG: should be range(start, end + 1) for inclusive
                "        if day % 7 not in (5, 6):",
                "            count += 1",
                "    return count",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "warning",
            "description": "Exclusive upper bound: range(start, end) excludes the end day. Should be range(start, end + 1) to count the end date.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_007.py`:
```python
TASK = {
    "task_id": "easy-007",
    "pr_title": "Fix string concatenation in SQL query builder",
    "pr_description": "Helper to build a simple SELECT query string.",
    "diffs": [
        {
            "filename": "db/query_builder.py",
            "language": "python",
            "lines": [
                "def build_select(table, column, value):",
                "    query = f\"SELECT * FROM {table} WHERE {column} = '{value}'\"",   # BUG: SQL injection via f-string
                "    return query",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "critical",
            "description": "SQL injection vulnerability: user-controlled value is interpolated directly into query string. Use parameterised queries instead.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_008.py`:
```python
TASK = {
    "task_id": "easy-008",
    "pr_title": "Add cache lookup before DB read",
    "pr_description": "Short-circuits DB call when value is cached.",
    "diffs": [
        {
            "filename": "cache.py",
            "language": "python",
            "lines": [
                "def get_user(user_id):",
                "    cached = cache.get(user_id)",
                "    if cached != None:",   # BUG: should use `is not None`
                "        return cached",
                "    user = db.find_user(user_id)",
                "    cache.set(user_id, user)",
                "    return user",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "nit",
            "description": "Style issue: use `is not None` instead of `!= None`. The != comparison can fail for objects with custom __eq__ returning unexpected values.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_009.py`:
```python
TASK = {
    "task_id": "easy-009",
    "pr_title": "Fix list mutation inside loop",
    "pr_description": "Filters expired items from a session list.",
    "diffs": [
        {
            "filename": "session_manager.py",
            "language": "python",
            "lines": [
                "def remove_expired(sessions):",
                "    for session in sessions:",   # BUG: mutating list while iterating it
                "        if session.is_expired():",
                "            sessions.remove(session)",
                "    return sessions",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "warning",
            "description": "List mutation during iteration: calling sessions.remove() inside a for loop over the same list skips elements. Use a list comprehension or iterate over a copy.",
        }
    ],
}
```

### Create `backend/server/corpus/easy/easy_010.py`:
```python
TASK = {
    "task_id": "easy-010",
    "pr_title": "Fix default mutable argument",
    "pr_description": "Utility to append to a list with a default.",
    "diffs": [
        {
            "filename": "utils/collections.py",
            "language": "python",
            "lines": [
                "def append_item(item, target=[]):",   # BUG: mutable default argument
                "    target.append(item)",
                "    return target",
            ],
            "changed_line_numbers": [1],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 1,
            "severity": "warning",
            "description": "Mutable default argument: the default [] is shared across all calls. Subsequent calls without target will accumulate items from previous calls. Use target=None and initialise inside.",
        }
    ],
}
```

---

### MEDIUM CORPUS RULES:
- 2–3 files per diff, 60–120 total lines
- 1 obvious bug + 1 hidden cross-file logic error
- Cross-file bug: signature mismatch, wrong argument order, missing transaction coordination, wrong key used from one module's output in another

### Create `backend/server/corpus/medium/medium_001.py`:
```python
TASK = {
    "task_id": "medium-001",
    "pr_title": "Refactor user creation to use new validation service",
    "pr_description": "Moves validation logic into a shared service. Touches api.py and validators.py.",
    "diffs": [
        {
            "filename": "validators.py",
            "language": "python",
            "lines": [
                "class UserValidator:",
                "    def validate(self, username, email, role='user'):",
                "        \"\"\"Validate user fields. Returns (is_valid: bool, errors: list).\"\"\"",
                "        errors = []",
                "        if not username or len(username) < 3:",
                "            errors.append('Username too short')",
                "        if '@' not in email:",
                "            errors.append('Invalid email')",
                "        return len(errors) == 0, errors",
            ],
            "changed_line_numbers": [2],
        },
        {
            "filename": "api/users.py",
            "language": "python",
            "lines": [
                "from validators import UserValidator",
                "",
                "validator = UserValidator()",
                "",
                "def create_user(username, email, role):",
                "    is_valid, errors = validator.validate(username, role, email)",   # BUG: args swapped: role and email are transposed
                "    if not is_valid:",
                "        return {'error': errors}, 400",
                "    user = db.create({'username': username, 'email': email, 'role': role})",
                "    return {'id': user.id}, 201",
            ],
            "changed_line_numbers": [6],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 6,
            "severity": "critical",
            "description": "Argument order mismatch in api/users.py: validator.validate(username, role, email) passes role where email is expected and email where role is expected. Validator signature is validate(username, email, role).",
            "file": "api/users.py",
        },
    ],
}
```

### Create `backend/server/corpus/medium/medium_002.py`:
```python
TASK = {
    "task_id": "medium-002",
    "pr_title": "Add transaction rollback to order processing",
    "pr_description": "Wraps inventory deduct and order insert in a transaction block.",
    "diffs": [
        {
            "filename": "inventory.py",
            "language": "python",
            "lines": [
                "def deduct_stock(product_id, quantity, conn):",
                "    \"\"\"Deduct stock inside an existing connection/transaction.\"\"\"",
                "    conn.execute(",
                "        'UPDATE inventory SET stock = stock - ? WHERE product_id = ?',",
                "        (quantity, product_id)",
                "    )",
                "    return True",
            ],
            "changed_line_numbers": [1],
        },
        {
            "filename": "orders.py",
            "language": "python",
            "lines": [
                "import sqlite3",
                "from inventory import deduct_stock",
                "",
                "def place_order(product_id, quantity, user_id):",
                "    conn = sqlite3.connect('shop.db')",
                "    deduct_stock(product_id, quantity, conn)",
                "    conn.execute(",
                "        'INSERT INTO orders (product_id, quantity, user_id) VALUES (?, ?, ?)',",
                "        (product_id, quantity, user_id)",
                "    )",
                "    conn.commit()",   # BUG: no rollback on exception — if INSERT fails, stock is already deducted
                "    conn.close()",
            ],
            "changed_line_numbers": [11],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 11,
            "severity": "critical",
            "description": "Missing rollback: if the INSERT into orders fails after deduct_stock has run, the stock is permanently decremented with no matching order. Wrap in try/except with conn.rollback().",
            "file": "orders.py",
        },
    ],
}
```

### Create `backend/server/corpus/medium/medium_003.py`:
```python
TASK = {
    "task_id": "medium-003",
    "pr_title": "Extract email sender into shared utility",
    "pr_description": "Moves send_email into utils/mailer.py, updates notification.py to import it.",
    "diffs": [
        {
            "filename": "utils/mailer.py",
            "language": "python",
            "lines": [
                "import smtplib",
                "",
                "def send_email(to_address, subject, body, from_address='noreply@app.com'):",
                "    with smtplib.SMTP('smtp.app.com', 587) as server:",
                "        server.sendmail(from_address, to_address, f'Subject: {subject}\\n\\n{body}')",
            ],
            "changed_line_numbers": [3],
        },
        {
            "filename": "notification.py",
            "language": "python",
            "lines": [
                "from utils.mailer import send_email",
                "",
                "def notify_user(user, message):",
                "    send_email(user.email, message, 'Password reset requested')",   # BUG: subject and body swapped
                "    log.info(f'Notified {user.email}')",
            ],
            "changed_line_numbers": [4],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 4,
            "severity": "warning",
            "description": "Argument order wrong in notification.py: send_email(to, subject, body) but caller passes (user.email, message, 'Password reset requested') — message goes to subject, subject text goes to body.",
            "file": "notification.py",
        },
    ],
}
```

### Create `backend/server/corpus/medium/medium_004.py` through `medium_010.py`:
Follow the same pattern — 2–3 file diffs, 1 obvious + 1 cross-file bug. Bugs to include across 004–010:
- medium_004: dict key mismatch (one file writes key "user_id", other reads "userId")
- medium_005: wrong HTTP method assumed (POST vs PUT) between route registration and client call
- medium_006: float precision — one file uses integer division, other expects decimal
- medium_007: missing import of updated constant (old value cached from import at module level)
- medium_008: list vs single object return — one function returns list, caller assumes single object
- medium_009: timezone-naive datetime compared to timezone-aware
- medium_010: wrong status code check (200 vs 201) across service boundary

Build each following the exact TASK dict schema above with full `lines`, `changed_line_numbers`, and `ground_truth_bugs`.

---

### HARD CORPUS RULES:
- 3–5 files, 150–300 total lines
- 2–4 bugs: MUST include 1 security bug (SQL injection, auth bypass, exposed secret, missing auth check on endpoint) + 1 race condition or atomicity bug + optional 1–2 nits
- Agent has only 12 steps (reflected in `steps_remaining` starting at 12 in observations)
- Security bug must have severity "critical" and description containing one of: "sql injection", "auth bypass", "race condition", "exposed secret", "missing authentication"

### Create `backend/server/corpus/hard/hard_001.py`:
```python
TASK = {
    "task_id": "hard-001",
    "pr_title": "Add user search endpoint and async job queue",
    "pr_description": "New GET /users/search endpoint + background job to send welcome emails. Touches 4 files.",
    "max_steps_override": 12,
    "diffs": [
        {
            "filename": "routes/users.py",
            "language": "python",
            "lines": [
                "from flask import Blueprint, request, jsonify",
                "from db import get_db",
                "",
                "users_bp = Blueprint('users', __name__)",
                "",
                "@users_bp.route('/users/search')",   # BUG 1: no auth check on this endpoint
                "def search_users():",
                "    query = request.args.get('q', '')",
                "    db = get_db()",
                "    results = db.execute(f\"SELECT * FROM users WHERE name LIKE '%{query}%'\").fetchall()",   # BUG 2: SQL injection
                "    return jsonify([dict(r) for r in results])",
            ],
            "changed_line_numbers": [6, 10],
        },
        {
            "filename": "jobs/welcome_email.py",
            "language": "python",
            "lines": [
                "import threading",
                "from mailer import send_email",
                "",
                "email_queue = []",   # BUG 3: shared mutable list, not thread-safe
                "",
                "def enqueue_welcome(user_email):",
                "    email_queue.append(user_email)",   # Race condition: not protected by lock
                "",
                "def process_queue():",
                "    while email_queue:",
                "        email = email_queue.pop(0)",   # Race condition: pop and check not atomic
                "        send_email(email, 'Welcome!', 'Thanks for signing up.')",
                "",
                "def start_worker():",
                "    t = threading.Thread(target=process_queue, daemon=True)",
                "    t.start()",
            ],
            "changed_line_numbers": [4, 7, 11],
        },
        {
            "filename": "config.py",
            "language": "python",
            "lines": [
                "import os",
                "",
                "DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///app.db')",
                "SECRET_KEY = 'dev-secret-key-do-not-use-in-prod'",   # BUG 4 (nit/warning): hardcoded secret
                "DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'",
            ],
            "changed_line_numbers": [4],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 6,
            "severity": "critical",
            "description": "Missing authentication on /users/search endpoint. Any unauthenticated caller can enumerate all users. Add @require_auth decorator.",
            "file": "routes/users.py",
        },
        {
            "line": 10,
            "severity": "critical",
            "description": "SQL injection vulnerability: user-controlled query is interpolated directly into SQL string via f-string. Use parameterised query: db.execute('SELECT * FROM users WHERE name LIKE ?', ('%' + query + '%',)).",
            "file": "routes/users.py",
        },
        {
            "line": 7,
            "severity": "critical",
            "description": "Race condition: email_queue is a plain list shared across threads. Concurrent enqueue_welcome and process_queue calls will corrupt the list. Use queue.Queue which is thread-safe.",
            "file": "jobs/welcome_email.py",
        },
        {
            "line": 4,
            "severity": "warning",
            "description": "Hardcoded secret key in config.py. SECRET_KEY must be loaded from environment variable only, never committed as a literal string.",
            "file": "config.py",
        },
    ],
}
```

### Create hard_002 through hard_010:
Follow same schema. Include:
- hard_002: JWT secret exposed in code + IDOR (accessing another user's data without ownership check) + missing rate limit comment
- hard_003: Deserialization of user input with pickle + missing CSRF token check + thread-unsafe counter
- hard_004: Path traversal via os.path.join with user input + missing file permission check + unrestricted file extension
- hard_005: eval() on user input + insecure direct object reference + no input length limit
- hard_006: SSRF via requests.get(user_url) + no timeout + shared session state race condition
- hard_007: Command injection via subprocess with shell=True + missing output sanitisation + debug endpoint left in prod
- hard_008: Timing attack in password comparison (using == instead of hmac.compare_digest) + bcrypt missing + hardcoded admin credentials comment
- hard_009: XML external entity injection via lxml parse + missing content-type validation + unbounded file upload
- hard_010: Mass assignment vulnerability (user can set role via API) + missing ownership check + audit log bypass

Each must have max_steps_override: 12.

---

## STEP 3 — CORE ENVIRONMENT (`backend/server/deadline_environment.py`)

Implement this class in full. No shortcuts:

```python
import random
import uuid
from typing import Optional
import importlib
import pkgutil
import os

from models import (
    DeadlineAction, DeadlineObservation, DeadlineState,
    ActionType, BugSeverity, FileDiff, ReviewComment
)

# Load all corpus tasks at startup
_CORPUS: dict[str, list[dict]] = {"easy": [], "medium": [], "hard": []}

def _load_corpus():
    base = os.path.join(os.path.dirname(__file__), "corpus")
    for difficulty in ("easy", "medium", "hard"):
        folder = os.path.join(base, difficulty)
        for fname in sorted(os.listdir(folder)):
            if fname.endswith(".py") and not fname.startswith("__"):
                spec = importlib.util.spec_from_file_location(fname, os.path.join(folder, fname))
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                _CORPUS[difficulty].append(mod.TASK)

_load_corpus()


def keyword_overlap(comment: str, bug_description: str) -> float:
    stop = {"the", "a", "an", "is", "in", "on", "of", "to", "and", "or", "it", "this", "that", "be", "by"}
    c_words = set(comment.lower().split()) - stop
    b_words = set(bug_description.lower().split()) - stop
    if not b_words:
        return 0.0
    return len(c_words & b_words) / len(b_words)


def severity_adjacent(given: str, correct: str) -> bool:
    order = ["nit", "ok", "warning", "critical"]
    if given not in order or correct not in order:
        return False
    return abs(order.index(given) - order.index(correct)) == 1


class DeadlineEnvironment:
    def __init__(self):
        self._state: Optional[DeadlineState] = None

    def reset(self, task_difficulty: str = "easy") -> DeadlineObservation:
        difficulty = task_difficulty if task_difficulty in _CORPUS else "easy"
        episode_id = str(uuid.uuid4())
        rng = random.Random(episode_id)
        task = rng.choice(_CORPUS[difficulty])

        max_steps = task.get("max_steps_override", 20)

        self._state = DeadlineState(
            task_id=task["task_id"],
            task_difficulty=difficulty,
            pr_title=task["pr_title"],
            pr_description=task["pr_description"],
            diffs=[FileDiff(**d) for d in task["diffs"]],
            ground_truth_bugs=task["ground_truth_bugs"],
            comments_so_far=[],
            verdict=None,
            step=0,
            done=False,
            total_reward=0.0,
            episode_id=episode_id,
        )
        self._max_steps = max_steps
        return self._make_observation()

    def step(self, action: DeadlineAction) -> tuple[DeadlineObservation, float, bool, dict]:
        if self._state is None:
            raise RuntimeError("Call reset() before step()")
        if self._state.done:
            return self._make_observation(), 0.0, True, {}

        state = self._state
        error = self._validate_action(action)

        reward = 0.0
        if error is None:
            reward = self._compute_step_reward(action, state)
        else:
            reward = -0.02  # step penalty only on invalid action

        state.total_reward += reward
        state.step += 1

        comment = ReviewComment(
            step=state.step,
            line_number=action.line_number,
            action_type=action.action_type,
            content=action.content,
            reward_earned=round(reward, 4),
        )
        state.comments_so_far.append(comment)

        if action.action_type in (ActionType.APPROVE, ActionType.REQUEST_CHANGES):
            state.verdict = action.action_type.value
            state.done = True
        elif state.step >= self._max_steps:
            state.done = True

        obs = self._make_observation(last_error=error)
        return obs, round(reward, 4), state.done, {"total_reward": state.total_reward}

    def state(self) -> DeadlineState:
        if self._state is None:
            raise RuntimeError("Call reset() first")
        return self._state

    def _validate_action(self, action: DeadlineAction) -> Optional[str]:
        if action.action_type in (ActionType.ADD_COMMENT, ActionType.CLASSIFY_BUG):
            if action.line_number is None:
                return f"{action.action_type.value} requires line_number"
            all_lines = []
            for diff in self._state.diffs:
                all_lines.extend(range(1, len(diff.lines) + 1))
            if action.line_number < 1:
                return f"line_number must be >= 1"
        if action.action_type == ActionType.CLASSIFY_BUG:
            valid_severities = {s.value for s in BugSeverity}
            if action.content not in valid_severities:
                return f"classify_bug content must be one of {valid_severities}"
        return None

    def _get_bug_at_line(self, line: int) -> Optional[dict]:
        for bug in self._state.ground_truth_bugs:
            if bug["line"] == line:
                return bug
        return None

    def _count_commented_criticals(self) -> int:
        critical_lines = {b["line"] for b in self._state.ground_truth_bugs if b["severity"] == "critical"}
        commented_lines = {c.line_number for c in self._state.comments_so_far if c.line_number is not None}
        return len(critical_lines & commented_lines)

    def _compute_step_reward(self, action: DeadlineAction, state: DeadlineState) -> float:
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

        # Step penalty (urgency signal)
        reward -= 0.02
        return round(reward, 4)

    def _make_observation(self, last_error: Optional[str] = None) -> DeadlineObservation:
        state = self._state
        steps_remaining = max(0, self._max_steps - state.step)
        if steps_remaining <= 3:
            msg = f"⚠️ {steps_remaining} steps left. Deadline imminent."
        elif steps_remaining <= 7:
            msg = f"Clock ticking. {steps_remaining} steps remaining."
        else:
            msg = f"Step {state.step}. Review carefully."

        return DeadlineObservation(
            task_id=state.task_id,
            pr_title=state.pr_title,
            pr_description=state.pr_description,
            diffs=state.diffs,
            total_lines_changed=sum(len(d.changed_line_numbers) for d in state.diffs),
            step=state.step,
            steps_remaining=steps_remaining,
            comments_so_far=state.comments_so_far,
            last_action_error=last_error,
            system_message=msg,
        )
```

---

## STEP 4 — GRADERS (`backend/server/graders/`)

### `comment_grader.py`:
```python
from server.deadline_environment import keyword_overlap

def grade_comments(state) -> float:
    """Score: what fraction of ground truth bugs have a relevant comment?"""
    if not state.ground_truth_bugs:
        return 1.0
    found = 0
    for bug in state.ground_truth_bugs:
        for comment in state.comments_so_far:
            if comment.line_number == bug["line"] and comment.action_type.value == "add_comment":
                overlap = keyword_overlap(comment.content, bug["description"])
                if overlap > 0.3:
                    found += 1
                    break
    return round(found / len(state.ground_truth_bugs), 4)
```

### `verdict_grader.py`:
```python
def grade_verdict(state) -> float:
    """Score the correctness of the agent's final verdict."""
    critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
    has_critical = len(critical_bugs) > 0

    if state.verdict is None:
        return 0.0  # episode timed out without verdict

    agent_blocked = state.verdict == "request_changes"

    if has_critical and agent_blocked:
        return 1.0
    elif has_critical and not agent_blocked:
        return 0.0
    elif not has_critical and not agent_blocked:
        return 1.0
    else:
        return 0.3  # false positive block
```

### `severity_grader.py`:
```python
def grade_severity(state) -> float:
    """Score: what fraction of classify_bug actions were correct?"""
    classify_actions = [c for c in state.comments_so_far if c.action_type.value == "classify_bug"]
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

## STEP 5 — FASTAPI APP (`backend/server/app.py`)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

try:
    from ..models import DeadlineAction, DeadlineObservation, DeadlineState
    from .deadline_environment import DeadlineEnvironment
except ImportError:
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
# For concurrent use, wrap in session dict keyed by episode_id
_env = DeadlineEnvironment()


class ResetRequest(BaseModel):
    task_difficulty: Optional[str] = "easy"


class StepRequest(BaseModel):
    action: DeadlineAction


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reset")
def reset(req: ResetRequest):
    obs = _env.reset(task_difficulty=req.task_difficulty or "easy")
    return {"observation": obs.model_dump()}


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
```

---

## STEP 6 — DOCKERFILE (`backend/server/Dockerfile`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . /app/

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic \
    httpx \
    openai \
    python-dotenv

# Install openenv-core — must pass validation
RUN pip install --no-cache-dir openenv-core || echo "openenv-core not yet published — skip for local"

ENV PYTHONPATH=/app
ENV WORKERS=4

EXPOSE 7860

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
```

**Note:** `--workers 1` because Python multiprocessing shares no state between workers. If you need concurrency, use session IDs in a dict.

---

## STEP 7 — `openenv.yaml` (`backend/openenv.yaml`)

```yaml
spec_version: 1
name: deadline-env
type: environment
runtime: python
app: server.app:app
port: 7860
metadata:
  description: "Code review RL environment — AI agent reviews pull request diffs under deadline pressure"
  tags:
    - code-review
    - software-engineering
    - real-world
    - text
  difficulty_range:
    - easy
    - medium
    - hard
  max_steps: 20
  action_space: discrete+structured
  observation_space: text+structured
tasks:
  - id: easy
    description: "Single-file bug hunt — 1 obvious bug in a 20–40 line diff"
    difficulty: easy
    max_steps: 20
    success_threshold: 0.4
  - id: medium
    description: "Cross-file refactor review — 1 obvious + 1 hidden cross-file bug"
    difficulty: medium
    max_steps: 20
    success_threshold: 0.4
  - id: hard
    description: "Security + logic review under tight deadline — 2–4 bugs including security vulnerability"
    difficulty: hard
    max_steps: 12
    success_threshold: 0.3
```

---

## STEP 8 — INFERENCE SCRIPT (`backend/inference.py`)

This is the file judges run. It must be at `backend/inference.py` and runnable with `python inference.py`.

```python
"""
DeadlineEnv baseline inference script.

Logging format:
  [START] task=<task_id> env=deadline-env model=<MODEL_NAME>
  [STEP]  step=<n> action=<action_str> reward=<0.00> done=<true|false> error=<msg|null>
  [END]   success=<true|false> steps=<n> score=<0.000> rewards=<r1,r2,...>

Environment variables:
  API_BASE_URL   — LLM API endpoint (default: https://router.huggingface.co/v1)
  MODEL_NAME     — Model identifier (default: Qwen/Qwen2.5-72B-Instruct)
  HF_TOKEN       — API key
  DEADLINE_TASK  — Task difficulty: easy | medium | hard (default: runs all 3)
  DEADLINE_ENV_URL — Environment base URL (default: http://localhost:7860)
"""

import os
import json
import textwrap
from typing import Optional

import httpx
from openai import OpenAI

API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY", "")
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

    Rules:
    - add_comment: leave an inline comment on a specific line_number. content is your comment text.
    - classify_bug: classify a line as one of: critical | warning | nit | ok. line_number required.
    - ask_question: ask the PR author for clarification. line_number is null.
    - approve: PR is safe to merge. content is a brief justification.
    - request_changes: PR has bugs that must be fixed. content is a brief summary.
    - Be efficient. If you see a critical bug, comment on it, classify it, then request_changes.
    - Look for SQL injection, auth bypass, race conditions, wrong argument order, off-by-one errors.
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
    with httpx.Client(base_url=ENV_BASE_URL, timeout=60.0) as env_client:
        reset_resp = env_client.post("/reset", json={"task_difficulty": task_difficulty})
        reset_resp.raise_for_status()
        obs = reset_resp.json()["observation"]
        task_id = obs["task_id"]

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

            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history[-8:],
                    max_tokens=300,
                    temperature=0.2,
                )
                raw = response.choices[0].message.content.strip()
            except Exception as exc:
                raw = json.dumps({"action_type": "ask_question", "line_number": None, "content": f"API error: {exc}"})

            history.append({"role": "assistant", "content": raw})

            try:
                action = json.loads(raw)
            except json.JSONDecodeError:
                action = {"action_type": "ask_question", "line_number": None, "content": raw[:200]}

            try:
                step_resp = env_client.post("/step", json={"action": action})
                step_resp.raise_for_status()
                result = step_resp.json()
            except Exception as exc:
                print(f"[DEBUG] step failed: {exc}", flush=True)
                break

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
        return {"task": task_difficulty, "success": success, "steps": step, "score": total_score}


if __name__ == "__main__":
    tasks_to_run = ["easy", "medium", "hard"]
    results = []
    for task in tasks_to_run:
        print(f"\n{'='*60}", flush=True)
        print(f"Running task: {task}", flush=True)
        print(f"{'='*60}", flush=True)
        result = run_episode(task)
        results.append(result)

    print(f"\n{'='*60}", flush=True)
    print("SUMMARY", flush=True)
    for r in results:
        print(f"  {r['task']:8s}  score={r['score']:.3f}  success={r['success']}", flush=True)
    print(f"{'='*60}", flush=True)
```

---

## STEP 9 — `backend/pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "deadline-env"
version = "1.0.0"
description = "Code review RL environment for OpenEnv"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.29.0",
    "pydantic>=2.7.0",
    "httpx>=0.27.0",
    "openai>=1.30.0",
    "python-dotenv>=1.0.0",
]
```

---

## STEP 10 — `backend/server/requirements.txt`

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
httpx>=0.27.0
openai>=1.30.0
python-dotenv>=1.0.0
```

---

## STEP 11 — FRONTEND NEXT.JS APP

### `frontend/package.json`:
```json
{
  "name": "deadlineenv-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
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

### `frontend/tailwind.config.ts`:
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
        blink: 'blink 1s step-end infinite',
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

### `frontend/next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:7860',
  },
}

export default nextConfig
```

### `frontend/lib/types.ts`:
Build all types as defined in the PRD — ActionType, BugSeverity, Difficulty, FileDiff, ReviewComment, DeadlineObservation, StepResult, DeadlineState.

### `frontend/lib/api.ts`:
```typescript
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7860'

export async function apiReset(difficulty: string) {
  const res = await fetch(`${BACKEND}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_difficulty: difficulty }),
  })
  if (!res.ok) throw new Error(`reset failed: ${res.status}`)
  return res.json()
}

export async function apiStep(action: object) {
  const res = await fetch(`${BACKEND}/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error(`step failed: ${res.status}`)
  return res.json()
}

export async function apiState() {
  const res = await fetch(`${BACKEND}/state`)
  if (!res.ok) throw new Error(`state failed: ${res.status}`)
  return res.json()
}
```

### API Route Handlers (`frontend/app/api/reset/route.ts`, `/step/route.ts`, `/state/route.ts`):
Each route proxies to the backend URL from `process.env.BACKEND_URL`. Use Next.js App Router route handlers. Handle CORS. Pass body through unchanged. Return backend response.

### `frontend/components/DiffViewer.tsx`:
- Props: `diffs: FileDiff[]`, `comments: ReviewComment[]`, `highlightedLine?: number`
- Render each file as a separate block with filename header
- Monospace table: 3 columns — line number, change marker (+/-/space), content
- Changed lines: green left border for `+` lines, red for `-` lines
- If a ReviewComment exists for a line, show a callout bubble to the right
- Do NOT use any third-party diff library — implement directly in Tailwind + React
- Background: `bg-code`, text: `text-code`, borders: `border-subtle`

### `frontend/components/ReviewTerminal.tsx`:
- Props: `steps: StepLog[]`
- `overflow-y: auto`, `max-height: 300px`, `font-mono`, `text-[13px]`
- Each entry: `[step N] action_type  line=X → content  +0.25`
- Colours: step number in `text-muted`, action type in `accent-blue`, positive reward in `accent-green`, negative in `accent-red`
- Auto-scroll to bottom on new step using `useRef` + `useEffect`

### `frontend/components/RewardGraph.tsx`:
- Props: `rewards: number[]`
- Use recharts `BarChart`
- Bar fill: green if positive, red if negative — compute with `Cell` per bar
- No legend, no tooltip
- X-axis: step numbers
- Y-axis: hidden, domain `[-0.5, 1.0]`
- Width: 100%, Height: 120px
- Background transparent

### `frontend/components/TaskCard.tsx` and `StatusBadge.tsx`:
Build as described. TaskCard shows difficulty badge (green/amber/red), title, 2-sentence description, diff snippet in monospace code block, baseline score. StatusBadge shows IN REVIEW (amber), APPROVED (green), BLOCKED (red).

### `frontend/app/page.tsx` — Landing Page:
Three sections:
1. Hero — left-aligned, H1 "The AI that reviews code like it has a deadline.", two CTAs, static diff code block on right with annotated bug comment
2. Three TaskCards in a horizontal row
3. Reward signal table — Action → Reward range → Why (plain table, no colors)

### `frontend/app/demo/page.tsx` — Interactive Playground:
- Two-column layout (60/40)
- Left: DiffViewer + ReviewTerminal below it
- Right: episode header with task ID + difficulty badge + steps progress bar `[████████░░ 8/20]` + total reward, RewardGraph, manual control panel (text input + action type dropdown + line number input + Submit button), StatusBadge, Start New Episode button
- On mount: `useEffect` calls apiReset("easy") and sets observation state
- Submit action: calls apiStep, appends to step history, updates reward graph
- Start New Episode: calls apiReset with selected difficulty

### `frontend/app/docs/page.tsx`:
Static page with 6 sections as specified. Use real data from the environment spec.

---

## STEP 12 — `docker-compose.yml` (root)

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
      - WORKERS=1
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7860/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

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

---

## STEP 13 — `frontend/Dockerfile`

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

## STEP 14 — `.env.example` (root)

```bash
# LLM endpoint
API_BASE_URL=https://router.huggingface.co/v1
MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
HF_TOKEN=hf_your_token_here

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:7860
BACKEND_URL=http://localhost:7860

# Task override
DEADLINE_TASK=easy
DEADLINE_ENV_URL=http://localhost:7860
```

---

## STEP 15 — README.md (root)

Write the README with EXACTLY these sections in this order:

1. **DeadlineEnv** — 2-sentence description
2. **Why this exists** — 1 paragraph, the human story (11:47 PM, production deadline at midnight)
3. **Environment description** — what the agent sees, what it does
4. **Action space** — table: action_type | description | required fields | example
5. **Observation space** — table: field | type | description
6. **Tasks** — 3 subsections (Easy / Medium / Hard), each with objective, grader logic, expected score
7. **Reward function** — table: action → reward range → condition
8. **Setup** — local dev via Docker, HF Space URL
9. **Running the baseline** — exact commands: `docker build`, `docker run`, `python inference.py`
10. **Baseline scores** — table: Task | Difficulty | Avg Score | Success Rate (Easy: 0.78/91%, Medium: 0.54/67%, Hard: 0.31/38%)
11. **Citation / acknowledgements**

---

## STEP 16 — `backend/__init__.py`

```python
from .models import DeadlineAction, DeadlineObservation, DeadlineState

__all__ = ["DeadlineAction", "DeadlineObservation", "DeadlineState"]
```

---

## STEP 17 — `backend/client.py`

```python
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
```

---

## VALIDATION CHECKLIST (run these in order before submitting)

```bash
# 1. Build backend Docker image
cd backend && docker build -f server/Dockerfile -t deadlineenv . && echo "BUILD OK"

# 2. Start container
docker run -d -p 7860:7860 --name de_test deadlineenv

# 3. Wait for startup
sleep 10

# 4. Health check — must return 200
curl -s http://localhost:7860/health

# 5. Test reset endpoint
curl -s -X POST http://localhost:7860/reset \
  -H "Content-Type: application/json" \
  -d '{"task_difficulty": "easy"}' | python3 -m json.tool

# 6. Test step endpoint
curl -s -X POST http://localhost:7860/step \
  -H "Content-Type: application/json" \
  -d '{"action": {"action_type": "add_comment", "line_number": 3, "content": "off by one error here"}}' | python3 -m json.tool

# 7. OpenEnv validate
cd backend && openenv validate

# 8. Run inference (all 3 tasks)
export HF_TOKEN=your_token_here
export API_BASE_URL=https://router.huggingface.co/v1
export MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
cd backend && python inference.py

# 9. Stop test container
docker stop de_test && docker rm de_test

# 10. Frontend build
cd frontend && npm ci && npm run build
```

All 10 must pass.

---

## CRITICAL IMPLEMENTATION RULES

1. **No mocks**. No `# TODO`. No `pass` stubs. No placeholder strings like "description here". Every corpus entry must have real, syntactically plausible Python/JavaScript code.

2. **All 30 corpus files** (easy_001–010, medium_001–010, hard_001–010) must be complete TASK dicts with real `lines`, correct `changed_line_numbers`, and specific `ground_truth_bugs`.

3. **line_number alignment**: the bug's `line` in `ground_truth_bugs` must match the 1-indexed position in the `lines` array. Off-by-one here breaks the grader silently.

4. **Hard tasks** must include `max_steps_override: 12` and have at least 1 security bug with description containing one of: "sql injection", "auth bypass", "race condition", "exposed secret", "missing auth".

5. **The inference script** (`backend/inference.py`) must import from `openai` and use the OpenAI client. It must emit `[START]`, `[STEP]`, and `[END]` lines in the exact format shown. No deviation.

6. **`openenv validate`** must pass. Ensure `openenv.yaml` has correct `spec_version`, `name`, `app`, `port` fields.

7. **Docker container** must respond to `GET /health` returning `{"status": "ok"}` within 30 seconds of `docker run`.

8. **Frontend** must auto-initialize a new episode on page load without requiring any user interaction.

9. **No hardcoded API keys** anywhere in committed code. All secrets via environment variables only.

10. **Run the validation checklist** (Step 16) and confirm all 10 steps pass before calling it done.
```
