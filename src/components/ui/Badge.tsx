import type { ReactNode } from 'react'
import type { Season, StockStatus } from '@/types'
import { seasonBadgeClass, seasonLabel, stockStatusBadge, stockStatusLabel } from '@/utils/tire'

interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'info'
  dot?: boolean
  children: ReactNode
}

export function Badge({ tone = 'neutral', dot, children }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}

export function SeasonBadge({ season }: { season: Season }) {
  return <span className={`badge ${seasonBadgeClass(season)}`}>{seasonLabel(season)}</span>
}

export function StockBadge({ status, quantity }: { status: StockStatus; quantity?: number }) {
  return (
    <span className={`badge ${stockStatusBadge[status]}`}>
      <span className="badge-dot" />
      {quantity !== undefined && status !== 'out' ? `${quantity} st` : stockStatusLabel[status]}
    </span>
  )
}
