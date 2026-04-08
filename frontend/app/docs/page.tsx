import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DeadlineEnv — Documentation',
  description: 'Full API reference, action space, observation space, task descriptions, and setup instructions for DeadlineEnv.',
}

export default function DocsPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-16 flex flex-col gap-16">

      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold mb-3" style={{ color: '#e6edf3' }}>Documentation</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#7d8590' }}>
          Complete reference for the DeadlineEnv OpenEnv reinforcement learning environment.
        </p>
      </div>

      {/* 1. Environment Description */}
      <section id="environment" className="flex flex-col gap-4">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          1. Environment Description
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#7d8590' }}>
          DeadlineEnv is an episodic RL environment where an agent reviews pull request diffs under a step budget
          (the &ldquo;deadline&rdquo;). Each episode presents the agent with one PR from a seeded corpus, containing
          Python diffs across one to five files. The agent takes structured actions — adding inline comments, classifying
          bug severity, asking clarifying questions, and finally issuing a verdict (approve or request changes).
          Reward is shaped across the full trajectory, rewarding accurate bug detection and penalising noise and
          missed critical bugs.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#7d8590' }}>
          The environment is a pure Python state machine backed by FastAPI. No GPU is required. Each step executes
          in under 200ms. The corpus contains 30 hand-crafted diffs across three difficulty tiers (10 each).
        </p>
      </section>

      {/* 2. Action Space */}
      <section id="actions" className="flex flex-col gap-4">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          2. Action Space
        </h2>
        <div className="rounded border overflow-hidden" style={{ borderColor: '#1e2227' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#131618', borderBottom: '1px solid #1e2227' }}>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-wider" style={{ color: '#7d8590' }}>action_type</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#7d8590' }}>Description</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#7d8590' }}>Required fields</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#7d8590' }}>Reward range</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['add_comment', 'Leave an inline comment on a specific line', 'line_number, content (comment text)', '+0.0 to +0.5'],
                ['classify_bug', 'Label a line: critical | warning | nit | ok', 'line_number, content (severity label)', '+0.0 to +0.25'],
                ['ask_question', 'Ask the PR author a clarifying question', 'content (question text)', '+0.05'],
                ['approve', 'Approve the PR — episode ends', 'content (justification)', '+0.4 to +0.7 or −0.5'],
                ['request_changes', 'Block the PR — episode ends', 'content (summary)', '+0.5 to +1.0 or −0.1'],
              ].map(([at, desc, req, rng], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2227', backgroundColor: i % 2 === 0 ? 'transparent' : '#131618' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#79c0ff' }}>{at}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#e6edf3' }}>{desc}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#7d8590' }}>{req}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#3fb950' }}>{rng}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="rounded p-4 font-mono text-xs"
          style={{ backgroundColor: '#0a0c0e', border: '1px solid #1e2227', color: '#7d8590' }}
        >
          {'{'}<br />
          &nbsp;&nbsp;<span style={{ color: '#79c0ff' }}>&quot;action_type&quot;</span>: <span style={{ color: '#3fb950' }}>&quot;add_comment&quot;</span>,<br />
          &nbsp;&nbsp;<span style={{ color: '#79c0ff' }}>&quot;line_number&quot;</span>: <span style={{ color: '#d29922' }}>3</span>,<br />
          &nbsp;&nbsp;<span style={{ color: '#79c0ff' }}>&quot;content&quot;</span>: <span style={{ color: '#3fb950' }}>&quot;Off-by-one: start should be (page-1)*page_size&quot;</span><br />
          {'}'}
        </div>
      </section>

      {/* 3. Observation Space */}
      <section id="observations" className="flex flex-col gap-4">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          3. Observation Space
        </h2>
        <div className="rounded border overflow-hidden" style={{ borderColor: '#1e2227' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#131618', borderBottom: '1px solid #1e2227' }}>
                <th className="text-left px-4 py-3 font-mono text-xs uppercase tracking-wider" style={{ color: '#7d8590' }}>Field</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#7d8590' }}>Type</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: '#7d8590' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['task_id', 'string', 'E.g. "easy-003", "hard-007"'],
                ['pr_title', 'string', 'Pull request title'],
                ['pr_description', 'string', 'PR body text'],
                ['diffs', 'FileDiff[]', 'Array of file diffs with lines and changed_line_numbers'],
                ['total_lines_changed', 'int', 'Total number of changed lines across all files'],
                ['step', 'int', 'Current step number (0-indexed)'],
                ['steps_remaining', 'int', 'Steps left before forced termination'],
                ['comments_so_far', 'ReviewComment[]', 'All actions taken so far with their earned rewards'],
                ['last_action_error', 'string | null', 'Non-null if the last action was invalid'],
                ['system_message', 'string', 'Contextual nudge (e.g. "3 steps left. Deadline imminent.")'],
              ].map(([field, type, desc], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2227', backgroundColor: i % 2 === 0 ? 'transparent' : '#131618' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#79c0ff' }}>{field}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#d29922' }}>{type}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7d8590' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Tasks */}
      <section id="tasks" className="flex flex-col gap-6">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          4. Tasks
        </h2>

        {[
          {
            name: 'Easy — Single-File Bug Hunt',
            color: '#3fb950',
            obj: 'Review a 20–40 line single-file diff containing exactly one obvious bug. Bug types include off-by-one errors, wrong operators, missing None checks, and mutable default arguments.',
            grader: 'Bug line commented (+0.3 × overlap), correct severity (+0.25), correct verdict (+0.3–0.7), step efficiency bonus.',
            score: '0.78 avg — 91% success rate',
            stepBudget: '20 steps',
            exampleDiff: [
              'def get_page_slice(items, page, page_size):',
              '    """Return the slice (1-indexed)."""',
              '-    start = (page - 1) * page_size',
              '+    start = page * page_size  # BUG: skips page 1',
              '    return items[start:start+page_size]',
            ],
          },
          {
            name: 'Medium — Cross-File Refactor Review',
            color: '#d29922',
            obj: 'Review a 60–120 line diff spanning 2–3 files. Contains 1 obvious bug and 1 hidden cross-file logic error — argument order swaps, missing transaction rollbacks, type mismatches across module boundaries.',
            grader: 'Each bug found and commented (+0.25), correct severity per bug (+0.1), correct verdict (+0.2), both-bugs-found bonus (+0.1).',
            score: '0.54 avg — 67% success rate',
            stepBudget: '20 steps',
            exampleDiff: [
              '# validators.py',
              'def validate(self, username, email, role):',
              '    ...',
              '# api/users.py — cross-file bug',
              '+validator.validate(username, role, email)  # BUG: args swapped',
            ],
          },
          {
            name: 'Hard — Security Review Under Pressure',
            color: '#f85149',
            obj: 'Review a 150–300 line diff across 3–5 files. Contains 2–4 bugs: a security vulnerability (SQL injection, auth bypass, SSRF, command injection), a race condition or atomicity bug, and optional nits. Only 12 steps.',
            grader: 'Security bug found + commented (+0.4), classified critical (+0.1), mentions vulnerability class keyword (+0.1), race condition found (+0.2), correct verdict (+0.15).',
            score: '0.31 avg — 38% success rate',
            stepBudget: '12 steps (tight deadline)',
            exampleDiff: [
              '@app.route("/users/search")  # no @require_auth!',
              'def search_users():',
              '    q = request.args.get("q", "")',
              '+    results = db.execute(f"SELECT * FROM users',
              '+      WHERE name LIKE \'%{q}%\'")  # SQL injection',
            ],
          },
        ].map((task) => (
          <div
            key={task.name}
            className="rounded border p-5 flex flex-col gap-4"
            style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium" style={{ color: '#e6edf3' }}>{task.name}</h3>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ color: task.color, border: `1px solid ${task.color}`, backgroundColor: `${task.color}15` }}
              >
                {task.stepBudget}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: '#7d8590' }}>Objective</div>
                <p className="text-xs leading-relaxed" style={{ color: '#7d8590' }}>{task.obj}</p>
              </div>
              <div>
                <div className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: '#7d8590' }}>Grader</div>
                <p className="text-xs leading-relaxed" style={{ color: '#7d8590' }}>{task.grader}</p>
                <div className="mt-2 text-xs font-mono" style={{ color: task.color }}>Expected: {task.score}</div>
              </div>
            </div>
            <div
              className="rounded p-3 font-mono text-xs overflow-x-auto"
              style={{ backgroundColor: '#0a0c0e', border: '1px solid #1e2227' }}
            >
              {task.exampleDiff.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.startsWith('+') ? '#3fb950' : line.startsWith('-') ? '#ffa198' : '#7d8590',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 5. Setup */}
      <section id="setup" className="flex flex-col gap-4">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          5. Setup
        </h2>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium" style={{ color: '#e6edf3' }}>Docker (recommended)</div>
          <pre
            className="rounded p-4 text-xs font-mono overflow-x-auto"
            style={{ backgroundColor: '#0a0c0e', border: '1px solid #1e2227', color: '#e6edf3' }}
          >{`# Clone and run both services
git clone <repo-url>
cd deadlineenv
docker compose up

# Backend runs at http://localhost:7860
# Frontend runs at http://localhost:3000`}</pre>

          <div className="text-sm font-medium mt-4" style={{ color: '#e6edf3' }}>Local dev (no Docker)</div>
          <pre
            className="rounded p-4 text-xs font-mono overflow-x-auto"
            style={{ backgroundColor: '#0a0c0e', border: '1px solid #1e2227', color: '#e6edf3' }}
          >{`# Backend
cd backend
pip install -r server/requirements.txt
uvicorn server.app:app --host 0.0.0.0 --port 7860

# Frontend (separate terminal)
cd frontend
npm install
npm run dev`}</pre>
        </div>
      </section>

      {/* 6. Baseline Scores */}
      <section id="scores" className="flex flex-col gap-4">
        <h2 className="text-xl font-medium border-b pb-3" style={{ color: '#e6edf3', borderColor: '#1e2227' }}>
          6. Baseline Scores
        </h2>
        <p className="text-sm" style={{ color: '#7d8590' }}>
          Measured with <span className="font-mono text-xs" style={{ color: '#79c0ff' }}>Qwen/Qwen2.5-72B-Instruct</span> via HuggingFace Inference API. Run with <span className="font-mono text-xs" style={{ color: '#79c0ff' }}>python inference.py</span> from the <span className="font-mono text-xs">backend/</span> directory.
        </p>
        <div className="rounded border overflow-hidden" style={{ borderColor: '#1e2227' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#131618', borderBottom: '1px solid #1e2227' }}>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#7d8590' }}>Task</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#7d8590' }}>Difficulty</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#7d8590' }}>Avg Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#7d8590' }}>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['easy-*', 'Easy', '0.78', '91%', '#3fb950'],
                ['medium-*', 'Medium', '0.54', '67%', '#d29922'],
                ['hard-*', 'Hard', '0.31', '38%', '#f85149'],
              ].map(([task, diff, score, rate, color], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2227', backgroundColor: i % 2 === 0 ? 'transparent' : '#131618' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#e6edf3' }}>{task}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-mono px-2 py-0.5 rounded" style={{ color, border: `1px solid ${color}`, backgroundColor: `${color}15` }}>
                      {diff}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#e6edf3' }}>{score}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color }}>{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
