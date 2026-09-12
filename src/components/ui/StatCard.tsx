import type { ReactNode } from 'react'

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  icon: ReactNode
  tone?: Tone
  footer?: ReactNode
  onClick?: () => void
}

/** Stort, läsbart nyckeltal — kärnan i den svenska översiktsvyn. */
export function StatCard({ label, value, unit, icon, tone = 'default', footer, onClick }: StatCardProps) {
  const className = `stat ${tone === 'default' ? '' : `stat-${tone}`}`

  return (
    <div
      className={className}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {footer && <div className="stat-foot">{footer}</div>}
    </div>
  )
}
