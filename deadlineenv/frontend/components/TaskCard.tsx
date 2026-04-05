'use client'

import { Difficulty } from '@/lib/types'

interface TaskCardProps {
  difficulty: Difficulty
  title: string
  description: string
  baselineScore: number
  exampleDiff: string[]
}

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: '#3fb950',
  medium: '#d29922',
  hard: '#f85149',
}

export default function TaskCard({ difficulty, title, description, baselineScore, exampleDiff }: TaskCardProps) {
  const color = DIFF_COLOR[difficulty]

  return (
    <div
      className="rounded border p-4 flex flex-col gap-3 min-w-0"
      style={{ backgroundColor: '#131618', borderColor: '#1e2227' }}
    >
      {/* Difficulty badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded uppercase tracking-wider font-medium"
          style={{ color, border: `1px solid ${color}`, backgroundColor: `${color}15` }}
        >
          {difficulty}
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: '#0a0c0e', color: '#7d8590' }}
        >
          baseline: {(baselineScore * 100).toFixed(0)}%
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium" style={{ color: '#e6edf3' }}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-xs leading-relaxed" style={{ color: '#7d8590' }}>
        {description}
      </p>

      {/* Diff snippet */}
      <div
        className="rounded p-3 font-mono text-xs overflow-x-auto"
        style={{ backgroundColor: '#0a0c0e', border: '1px solid #1e2227' }}
      >
        {exampleDiff.map((line, i) => (
          <div key={i} style={{ color: line.startsWith('+') ? '#3fb950' : line.startsWith('-') ? '#ffa198' : '#7d8590' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
