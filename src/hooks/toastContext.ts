import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  tone: ToastTone
  title: string
  text?: string
}

export interface ToastApi {
  success: (title: string, text?: string) => void
  error: (title: string, text?: string) => void
  info: (title: string, text?: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast måste användas inuti ToastProvider.')
  return context
}
