import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  block?: boolean
  loading?: boolean
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  primary: 'btn-primary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const SIZE_CLASS: Record<Size, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  block,
  loading,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['btn', VARIANT_CLASS[variant], SIZE_CLASS[size], block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading ? <span className="spinner" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  icon,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  )
}
