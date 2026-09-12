import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastMessage, type ToastTone } from '@/hooks/toastContext'
import { IconCheck, IconInfo, IconWarning } from './Icons'

const DURATION_MS = 4200

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <IconCheck size={17} />,
  error: <IconWarning size={17} />,
  info: <IconInfo size={17} />,
}

const TONE_COLOR: Record<ToastTone, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--info)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, title: string, text?: string) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, tone, title, text }])
      window.setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      success: (title: string, text?: string) => push('success', title, text),
      error: (title: string, text?: string) => push('error', title, text),
      info: (title: string, text?: string) => push('info', title, text),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toaster">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.tone}`}
            role="status"
            onClick={() => dismiss(toast.id)}
          >
            <span style={{ color: TONE_COLOR[toast.tone], marginTop: 1 }}>{TONE_ICON[toast.tone]}</span>
            <div>
              <div className="toast-title">{toast.title}</div>
              {toast.text && <div className="toast-text">{toast.text}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
