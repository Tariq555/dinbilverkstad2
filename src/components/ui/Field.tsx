import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, required, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; large?: boolean }

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput(
  { invalid, large, className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`input ${large ? 'input-lg' : ''} ${invalid ? 'invalid' : ''} ${className}`}
      {...props}
    />
  )
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...props },
  ref
) {
  return (
    <select ref={ref} className={`select ${invalid ? 'invalid' : ''} ${className}`} {...props}>
      {children}
    </select>
  )
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`textarea ${className}`} {...props} />
  }
)
