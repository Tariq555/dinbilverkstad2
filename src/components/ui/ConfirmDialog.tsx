import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Används för alla åtgärder som inte går att ångra med ett klick. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Bekräfta',
  cancelLabel = 'Avbryt',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>{message}</div>
    </Modal>
  )
}
