import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

export function LoadingBlock({ label = 'Laddar…' }: { label?: string }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-danger" style={{ margin: 20 }}>
      <div className="grow">
        <strong>Något gick fel</strong>
        <div style={{ marginTop: 2 }}>{message}</div>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Försök igen
        </button>
      )}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton" style={{ height: 44, opacity: 1 - index * 0.1 }} />
      ))}
    </div>
  )
}
