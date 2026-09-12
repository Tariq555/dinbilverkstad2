import type { ReactNode } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  )
}
