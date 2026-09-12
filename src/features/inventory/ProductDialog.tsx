import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { IconWarning } from '@/components/ui/Icons'
import { TireFormFields } from '@/features/tires/TireFormFields'
import {
  emptyForm,
  formFromProduct,
  toDraft,
  validateForm,
  type TireFormErrors,
  type TireFormValues,
} from '@/features/tires/tireForm'
import { api, errorMessage } from '@/services/api'
import { useApp } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import type { Product } from '@/types'

interface ProductDialogProps {
  open: boolean
  product: Product | null
  locations: string[]
  onClose: () => void
  onSaved: () => void
}

/** Redigerar en befintlig produkt, eller skapar en ny från lagervyn. */
export function ProductDialog({ open, product, locations, onClose, onSaved }: ProductDialogProps) {
  const { settings } = useApp()
  const toast = useToast()

  const [values, setValues] = useState<TireFormValues>(() => emptyForm(settings))
  const [errors, setErrors] = useState<TireFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(product ? formFromProduct(product) : emptyForm(settings))
    setErrors({})
    setError(null)
  }, [open, product, settings])

  const handleSave = async () => {
    const validation = validateForm(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setSaving(true)
    setError(null)
    try {
      const draft = toDraft(values)
      if (product) {
        await api.updateProduct(product.id, draft)
        toast.success('Produkten uppdaterad', `${draft.brand} ${draft.model}`)
      } else {
        await api.createProduct(draft)
        toast.success('Produkten sparad', `${draft.brand} ${draft.model}`)
      }
      onSaved()
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      wide
      title={product ? 'Redigera däck' : 'Nytt däck'}
      subtitle={product ? `${product.sku} · skapades ${new Date(product.createdAt).toLocaleDateString('sv-SE')}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Avbryt
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Spara
          </Button>
        </>
      }
    >
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <IconWarning size={16} />
          <span>{error}</span>
        </div>
      )}
      <TireFormFields
        values={values}
        errors={errors}
        locations={locations}
        currency={settings.currency}
        compact
        onChange={setValues}
      />
    </Modal>
  )
}
