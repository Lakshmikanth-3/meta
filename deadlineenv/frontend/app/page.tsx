import type { Metadata } from 'next'
import Link from 'next/link'
import TaskCard from '@/components/TaskCard'

export const metadata: Metadata = {
  title: 'DeadlineEnv — Code Review RL Environment',
  description: 'An OpenEnv RL environment where an AI agent learns to review pull requests under deadline pressure.',
}

const SAMPLE_DIFF = `def get_page_slice(items, page, page_size):
-    start = (page - 1) * page_size
+    start = page * page_size     # BUG
    return items[start:start+page_size]`

export default function HomePage() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-16 flex flex-col gap-20">

      {/* ── HERO ── */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs" style={{ color: '#7d8590' }}>
            // OpenEnv · Code Review RL Environment
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight" style={{ color: '#e6edf3' }}>
            The AI that reviews code like it has a deadline.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#7d8590' }}>
            DeadlineEnv is a reinforcement learning environment where an AI agent learns to review pull requests
            under the same pressure that engineers face at 11:47 PM before a midnight deploy window.
            The agent must find bugs, classify severity, and issue a verdict — all within a limited step budget.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/playground"
              id="cta-playground"
              className="px-5 py-2.5 rounded text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#3fb950', color: '#0d0f11' }}
            >
              Try the Playground →
            </Link>
            <a
              href="https://huggingface.co/spaces"
              target="_blank"
              rel="noopener noreferrer"
              id="cta-hf"
              className="px-5 py-2.5 rounded text-sm font-medium transition-colors hover:border-text-secondary"
              style={{ border: '1px solid #30363d', color: '#e6edf3' }}
            >
              View on HuggingFace
            </a>
          </div>
        </div>

        {/* Right — static diff block */}
        <div
          className="rounded border overflow-hidden font-mono text-xs"
          style={{ backgroundColor: '#0a0c0e', borderColor: '#1e2227' }}
        >
          <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: '#1e2227', backgroundColor: '#131618' }}>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3572A5', color: '#0d0f11' }}>python</span>
            <span style={{ color: '#7d8590' }}>utils/pagination.py</span>
          </div>
          <div className="p-4 flex flex-col gap-0.5">
            <div style={{ color: '#7d8590' }}><span style={{ color: '#484f58', marginRight: 12 }}>1</span>  def get_page_slice(items, page, page_size):</div>
            <div style={{ color: '#7d8590' }}><span style={{ color: '#484f58', marginRight: 12 }}>2</span>      {'"'}Return the slice for page (1-indexed).{'"'}</div>
            <div style={{ color: '#ffa198', borderLeft: '2px solid #f85149', paddingLeft: 8 }}>
              <span style={{ color: '#484f58', marginRight: 12 }}>3</span> *  start = page * page_size
            </div>
            <div style={{ color: '#7d8590' }}><span style={{ color: '#484f58', marginRight: 12 }}>4</span>      end = start + page_size</div>
            <div style={{ color: '#7d8590' }}><span style={{ color: '#484f58', marginRight: 12 }}>5</span>      return items[start:end]</div>
          </div>
          {/* Annotated bug comment */}
          <div className="mx-4 mb-4 px-3 py-2 rounded text-xs" style={{ borderLeft: '2px solid #f85149', backgroundColor: '#1a1e23', color: '#e6edf3' }}>
            <span style={{ color: '#f85149', marginRight: 8 }}>[classify_bug]</span>
            <span style={{ color: '#d29922' }}>critical</span>
            <span style={{ color: '#7d8590' }}> · line 3 → Off-by-one: should be (page-1)*page_size</span>
          </div>
        </div>
      </section>

      {/* ── TASK CARDS ── */}
      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-medium" style={{ color: '#e6edf3' }}>Three difficulty tiers</h2>
        <div className="grid lg:grid-cols-3 gap-4">
          <TaskCard
            difficulty="easy"
            title="Single-File Bug Hunt"
            description="Review a 20–40 line single-file diff containing exactly one obvious bug. Off-by-one errors, wrong operators, missing None checks."
            baselineScore={0.78}
            exampleDiff={[
              ' def get_page_slice(items, page, size):',
              '-    start = (page - 1) * size',
              '+    start = page * size  # BUG',
              '     return items[start:start+size]',
            ]}
          />
          <TaskCard
            difficulty="medium"
            title="Cross-File Refactor Review"
            description="Review a 60–120 line diff across 2–3 files. One obvious bug and one hidden cross-file logic error — wrong argument order, missing transactions."
            baselineScore={0.54}
            exampleDiff={[
              ' # validators.py',
              ' def validate(self, username, email, role):',
              ' # api.py — BUG: args swapped',
              '+validate(username, role, email)',
            ]}
          />
          <TaskCard
            difficulty="hard"
            title="Security Review Under Pressure"
            description="Review a 150–300 line diff. 2–4 bugs including a security vulnerability, a race condition, and optional nits. Only 12 steps."
            baselineScore={0.31}
            exampleDiff={[
              ' @app.route("/users/search")  # no auth!',
              '+results = db.execute(',
              '+  f"SELECT * FROM users WHERE name LIKE',
              "+  '%{query}%')"
            ]}
          />
        </div>
      </section>

      {/* ── REWARD TABLE ── */}
      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-medium" style={{ color: '#e6edf3' }}>Reward signal</h2>
        <div className="rounded border overflow-hidden" style={{ borderColor: '#1e2227' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#131618', borderBottom: '1px solid #1e2227' }}>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#7d8590' }}>Action</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#7d8590' }}>Reward range</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: '#7d8590' }}>Condition</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['add_comment on bug line', '+0.0 to +0.5', 'Keyword overlap with ground truth description (0.3× overlap + 0.2 bonus at >60%)'],
                ['add_comment on clean line', '−0.05', 'Noise penalty for false-positive comment'],
                ['classify_bug (correct severity)', '+0.25', 'Exact match to ground truth severity'],
                ['classify_bug (off by one level)', '+0.10', 'Adjacent severity (e.g. warning vs critical)'],
                ['ask_question', '+0.05', 'Small positive for engagement — no negative'],
                ['request_changes (has critical bug)', '+0.5 to +1.0', 'Base 0.5 + up to 0.5 proportional to critical bugs commented before verdict'],
                ['approve (no critical bugs)', '+0.4 to +0.7', 'Base 0.4 + efficiency bonus based on steps used'],
                ['approve (has critical bug)', '−0.50', 'Worst outcome — missed a ship-blocking bug'],
                ['Each step', '−0.02', 'Urgency penalty applied every step'],
              ].map(([action, range, condition], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2227', backgroundColor: i % 2 === 0 ? 'transparent' : '#131618' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#79c0ff' }}>{action}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#e6edf3' }}>{range}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7d8590' }}>{condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
