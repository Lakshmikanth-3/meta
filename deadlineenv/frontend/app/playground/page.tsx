'use client'

import { useState, useEffect, useCallback } from 'react'
import DiffViewer from '@/components/DiffViewer'
import ReviewTerminal from '@/components/ReviewTerminal'
import RewardGraph from '@/components/RewardGraph'
import StatusBadge from '@/components/StatusBadge'
import { DeadlineObservation, ActionType, StepLog, Difficulty } from '@/lib/types'
import TaskConfigurationWizard from '@/components/TaskConfigurationWizard'

const ACTION_TYPES: ActionType[] = ['add_comment', 'ask_question', 'classify_bug', 'approve', 'request_changes']

function EpisodeProgress({ step, maxSteps }: { step: number; maxSteps: number }) {
  const filled = Math.min(step, maxSteps)
  const pct = maxSteps > 0 ? filled / maxSteps : 0
  const blocks = 20
  const filledBlocks = Math.round(pct * blocks)
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(blocks - filledBlocks)
  return (
    <span className="font-mono text-xs" style={{ color: '#7d8590' }}>
      [{bar}] {step}/{maxSteps}
    </span>
  )
}

export default function PlaygroundPage() {
  const [obs, setObs] = useState<DeadlineObservation | null>(null)
  const [stepLogs, setStepLogs] = useState<StepLog[]>([])
  const [rewards, setRewards] = useState<number[]>([])
  const [totalReward, setTotalReward] = useState(0)
  const [episodeDone, setEpisodeDone] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<ActionType>('add_comment')
  const [lineNumber, setLineNumber] = useState('')
  const [content, setContent] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(true)

  const startEpisode = useCallback(async (diff: Difficulty, customTask?: any) => {
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_difficulty: diff,
          custom_task: customTask 
        }),
      })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(errorBody || `reset failed: ${res.status}`)
      }
      const data = await res.json()
      setObs(data.observation)
      setStepLogs([])
      setRewards([])
      setTotalReward(0)
      setEpisodeDone(false)
      setIsConfiguring(false)
    } catch (e) {
      setSubmitError(`Failed to connect to backend: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Remove auto-initialize, wait for user input
  useEffect(() => {
    // No auto-start
  }, [])

  const submitAction = async () => {
    if (!obs || submitting) return
    setSubmitError(null)
    setSubmitting(true)
    const action = {
      action_type: actionType,
      line_number: lineNumber !== '' ? parseInt(lineNumber, 10) : null,
      content,
    }
    try {
      const res = await fetch('/api/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(errorBody || `step failed: ${res.status}`)
      }
      const data = await res.json()
      const newObs: DeadlineObservation = data.observation
      const reward: number = data.reward
      const done: boolean = data.done

      setObs(newObs)
      setRewards((prev) => [...prev, reward])
      setTotalReward((prev) => prev + reward)
      setEpisodeDone(done)

      const log: StepLog = {
        step: newObs.step,
        action_type: actionType,
        line_number: action.line_number,
        content,
        reward,
      }
      setStepLogs((prev) => [...prev, log])
      setContent('')
    } catch (e) {
      setSubmitError(`Step failed: ${e}`)
    } finally {
      setSubmitting(false)
    }
  }

  const episodeStatus = episodeDone
    ? obs?.comments_so_far?.some((c) => c.action_type === 'approve')
      ? 'approved'
      : 'blocked'
    : 'in_review'

  const maxSteps = obs ? obs.step + obs.steps_remaining : 20

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium" style={{ color: '#e6edf3' }}>Interactive Playground</h1>
          <p className="text-xs mt-1" style={{ color: '#7d8590' }}>
            Review pull request diffs step-by-step. Actions are sent to the live environment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            id="difficulty-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="text-xs rounded px-3 py-1.5 font-mono"
            style={{ backgroundColor: '#131618', color: '#e6edf3', border: '1px solid #30363d', outline: 'none' }}
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
          <button
            onClick={() => setIsConfiguring(true)}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded font-mono transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: '#131618', color: '#e6edf3', border: '1px solid #30363d' }}
          >
            {loading ? 'Processing...' : '+ Create New Task'}
          </button>
        </div>
      </div>

      {isConfiguring ? (
        <TaskConfigurationWizard onStart={(task) => startEpisode('easy', task)} />
      ) : !obs && !loading ? (
        <div className="flex items-center justify-center h-64" style={{ color: '#484f58' }}>
          <span className="font-mono text-sm">Connecting to environment...</span>
        </div>
      ) : null}

      {obs && !isConfiguring && (
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── LEFT COLUMN (60%) ── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* PR header */}
            <div className="rounded border px-4 py-3" style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}>
              <div className="text-xs font-mono mb-1" style={{ color: '#7d8590' }}>{obs.task_id}</div>
              <div className="text-sm font-medium" style={{ color: '#e6edf3' }}>{obs.pr_title}</div>
              <div className="text-xs mt-1" style={{ color: '#7d8590' }}>{obs.pr_description}</div>
              {obs.last_action_error && (
                <div className="mt-2 text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#f8514920', color: '#f85149', border: '1px solid #f8514940' }}>
                  ⚠ {obs.last_action_error}
                </div>
              )}
              <div className="mt-2 text-xs font-mono" style={{ color: obs.steps_remaining <= 3 ? '#f85149' : '#7d8590' }}>
                {obs.system_message}
              </div>
            </div>

            {/* Diff viewer */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono flex items-center gap-2" style={{ color: '#7d8590' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#79c0ff]" style={{ boxShadow: '0 0 8px #79c0ff' }}></span>
                Click any line number or code block to target it for review
              </div>
              <DiffViewer
                diffs={obs.diffs}
                comments={obs.comments_so_far}
                highlightedLine={lineNumber !== '' ? parseInt(lineNumber, 10) : undefined}
                onLineClick={(num) => setLineNumber(num.toString())}
              />
            </div>

            {/* Review terminal */}
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: '#484f58' }}>
                // review actions
              </div>
              <ReviewTerminal steps={stepLogs} />
            </div>
          </div>

          {/* ── RIGHT COLUMN (40%) ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Episode header */}
            <div className="rounded border px-4 py-3 flex flex-col gap-3" style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}>
              <div className="flex items-center justify-between">
                <StatusBadge status={episodeStatus} />
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: totalReward >= 0 ? '#3fb950' : '#f85149' }}
                >
                  {totalReward >= 0 ? '+' : ''}{totalReward.toFixed(3)}
                </span>
              </div>
              <EpisodeProgress step={obs.step} maxSteps={maxSteps} />
            </div>

            {/* Reward graph */}
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: '#484f58' }}>
                // reward per step
              </div>
              <RewardGraph rewards={rewards} />
            </div>

            {/* Manual control panel */}
            <div
              className="rounded border p-4 flex flex-col gap-3"
              style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}
            >
              <div className="text-xs font-mono" style={{ color: '#484f58' }}>
                // submit action
              </div>

              {/* Action type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#7d8590' }}>Action type</label>
                <select
                  id="action-type-select"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionType)}
                  disabled={episodeDone}
                  className="text-xs rounded px-3 py-1.5 font-mono"
                  style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d', outline: 'none' }}
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Line number */}
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#7d8590' }}>
                  Line number <span style={{ color: '#484f58' }}>(required for add_comment, classify_bug)</span>
                </label>
                <input
                  id="line-number-input"
                  type="number"
                  min={1}
                  value={lineNumber}
                  onChange={(e) => setLineNumber(e.target.value)}
                  disabled={episodeDone}
                  className="text-xs rounded px-3 py-1.5 font-mono w-full"
                  style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d', outline: 'none' }}
                />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#7d8590' }}>Content</label>
                <textarea
                  id="content-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={episodeDone}
                  rows={3}
                  className="text-xs rounded px-3 py-2 font-mono w-full resize-none transition-all focus:ring-1 focus:ring-[#3fb950] focus:ring-offset-0"
                  style={{ backgroundColor: '#0a0c0e', color: '#e6edf3', border: '1px solid #30363d', outline: 'none' }}
                  placeholder={
                    actionType === 'add_comment' ? 'Explain the implementation issue here...' :
                    actionType === 'classify_bug' ? 'Enter severity: critical | warning | nit' :
                    actionType === 'ask_question' ? 'What do you need clarification on from the author?' :
                    'Enter your final review summary here...'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      if (!episodeDone && content.trim()) submitAction()
                    }
                  }}
                />
              </div>

              {submitError && (
                <div className="text-xs font-mono px-2 py-1.5 rounded" style={{ backgroundColor: '#f8514920', color: '#f85149', border: '1px solid #f8514940' }}>
                  {submitError}
                </div>
              )}

              <button
                id="submit-action-btn"
                onClick={submitAction}
                disabled={episodeDone || submitting || !content.trim()}
                className="text-sm py-2 rounded font-medium transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3fb950', color: '#0d0f11' }}
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-[#0d0f11]/30 border-t-[#0d0f11] rounded-full animate-spin"></span>
                    Sending review...
                  </>
                ) : (
                  episodeDone ? 'Episode Complete' : 'Submit Action'
                )}
              </button>

              <div className="text-xs text-center" style={{ color: '#484f58' }}>
                Ctrl+Enter to submit
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
