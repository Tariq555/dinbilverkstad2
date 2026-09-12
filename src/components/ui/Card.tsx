import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  action?: ReactNode
  padded?: boolean
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

export function Card({ title, action, padded = true, className = '', style, children }: CardProps) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || action) && (
        <header className="card-header">
          <h2 className="card-title">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? 'card-body' : ''}>{children}</div>
    </section>
  )
}
