'use client'

import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from 'recharts'

interface RewardGraphProps {
  rewards: number[]
}

export default function RewardGraph({ rewards }: RewardGraphProps) {
  const data = rewards.map((r, i) => ({ step: i + 1, reward: r }))

  if (data.length === 0) {
    return (
      <div
        className="rounded border flex items-center justify-center font-mono text-xs"
        style={{ backgroundColor: '#0a0c0e', borderColor: '#1e2227', height: '120px', color: '#484f58' }}
      >
        No steps yet
      </div>
    )
  }

  return (
    <div
      className="rounded border overflow-hidden"
      style={{ backgroundColor: '#0a0c0e', borderColor: '#1e2227', height: '120px' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} barCategoryGap="20%">
          <XAxis
            dataKey="step"
            tick={{ fill: '#484f58', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#1e2227' }}
            tickLine={false}
          />
          <Bar dataKey="reward" maxBarSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.reward >= 0 ? '#3fb950' : '#f85149'}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
