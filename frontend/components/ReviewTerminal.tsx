'use client'

import { useRef, useEffect } from 'react'
import { StepLog } from '@/lib/types'
import clsx from 'clsx'

interface ReviewTerminalProps {
  steps: StepLog[]
}

const ACTION_COLOR: Record<string, string> = {
  add_comment: '#79c0ff',
  ask_question: '#79c0ff',
  classify_bug: '#d29922',
  approve: '#3fb950',
  request_changes: '#f85149',
}

export default function ReviewTerminal({ steps }: ReviewTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps.length])

  if (steps.length === 0) {
    return (
      <div
        className="rounded border px-4 py-3 font-mono text-xs"
        style={{ backgroundColor: '#0a0c0e', borderColor: '#1e2227', color: '#484f58', minHeight: '120px' }}
      >
        <span className="animate-blink">█</span> Waiting for first action...
      </div>
    )
  }

  return (
    <div
      className="rounded border overflow-y-auto font-mono text-xs"
      style={{
        backgroundColor: '#0a0c0e',
        borderColor: '#1e2227',
        maxHeight: '300px',
        minHeight: '120px',
      }}
    >
      <div className="p-3 flex flex-col gap-0.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5 animate-slide-in">
            {/* Step number */}
            <span style={{ color: '#484f58', minWidth: '60px' }}>
              [step {s.step}]
            </span>

            {/* Action type */}
            <span style={{ color: ACTION_COLOR[s.action_type] || '#79c0ff', minWidth: '120px' }}>
              {s.action_type}
            </span>

            {/* Line number */}
            <span style={{ color: '#7d8590', minWidth: '64px' }}>
              {s.line_number != null ? `line=${s.line_number}` : '       '}
            </span>

            {/* Arrow + content */}
            <span style={{ color: '#7d8590', marginRight: 4 }}>→</span>
            <span style={{ color: '#e6edf3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.content.length > 60 ? s.content.slice(0, 57) + '...' : s.content}
            </span>

            {/* Reward */}
            <span
              style={{
                color: s.reward >= 0 ? '#3fb950' : '#f85149',
                minWidth: '48px',
                textAlign: 'right',
              }}
            >
              {s.reward >= 0 ? '+' : ''}{s.reward.toFixed(2)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
