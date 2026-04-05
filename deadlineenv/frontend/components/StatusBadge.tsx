'use client'

type Status = 'in_review' | 'approved' | 'blocked'

interface StatusBadgeProps {
  status: Status
}

const STATUS_CONFIG = {
  in_review: { label: 'IN REVIEW', color: '#d29922', bg: '#d2992215' },
  approved: { label: 'APPROVED', color: '#3fb950', bg: '#3fb95015' },
  blocked: { label: 'BLOCKED', color: '#f85149', bg: '#f8514915' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded uppercase tracking-widest font-medium"
      style={{ color: cfg.color, border: `1px solid ${cfg.color}`, backgroundColor: cfg.bg }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: cfg.color,
          boxShadow: `0 0 4px ${cfg.color}`,
          animation: status === 'in_review' ? 'blink 1s step-end infinite' : 'none',
        }}
      />
      {cfg.label}
    </span>
  )
}
