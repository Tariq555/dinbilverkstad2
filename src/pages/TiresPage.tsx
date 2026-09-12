import { useEffect, useRef, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { SeasonBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconCheck, IconPlus, IconTire, IconTrash, IconWarning } from '@/components/ui/Icons'
import { TireFormFields } from '@/features/tires/TireFormFields'
import {
  emptyForm,
  keepStickyFields,
  toDraft,
  validateForm,
  type TireFormErrors,
  type TireFormValues,
} from '@/features/tires/tireForm'
import { api, errorMessage } from '@/services/api'
import { useAsync } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import { formatCurrency, formatRelative } from '@/utils/format'
import { productLabel } from '@/utils/tire'
import type { Product } from '@/types'

/**
 * Snabbinmatning av däck.
 *
 * Tänkt för en anställd som registrerar många däck i följd: Ctrl+Enter sparar
 * och öppnar direkt nästa tomma formulär, medan märke, säsong och placering
 * ligger kvar eftersom de oftast är desamma för hela partiet.
 */
export function TiresPage() {
  const { settings, revision, refresh } = useApp()
  const toast = useToast()

  const [values, setValues] = useState<TireFormValues>(() => emptyForm(settings))
  const [errors, setErrors] = useState<TireFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionItems, setSessionItems] = useState<Product[]>([])
  const brandRef = useRef<HTMLInputElement>(null)

  const facets = useAsync(() => api.getFacets(), [revision])

  useEffect(() => {
    brandRef.current?.focus()
  }, [])

  const save = async (continueEntering: boolean) => {
    const validation = validateForm(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) {
      setError('Kontrollera de markerade fälten.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created = await api.createProduct(toDraft(values))
      setSessionItems((current) => [created, ...current].slice(0, 12))
      toast.success('Däck tillagt', `${productLabel(created)} · ${created.size}`)
      refresh()

      if (continueEntering) {
        setValues(keepStickyFields(values, settings))
        setErrors({})
        window.setTimeout(() => brandRef.current?.select(), 30)
      } else {
        setValues(emptyForm(settings))
        setErrors({})
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const undo = async (product: Product) => {
    try {
      await api.deleteProduct(product.id)
      setSessionItems((current) => current.filter((item) => item.id !== product.id))
      toast.info('Ångrat', `${productLabel(product)} togs bort igen.`)
      refresh()
    } catch (caught) {
      toast.error('Kunde inte ångra', errorMessage(caught))
    }
  }

  const sessionTotal = sessionItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <Topbar
        title="Lägg till däck"
        subtitle="Snabbregistrering — spara med Ctrl+Enter och fortsätt direkt med nästa däck"
        actions={
          sessionItems.length > 0 ? (
            <span className="badge badge-success">
              <IconCheck size={13} />
              {sessionItems.length} artiklar · {sessionTotal} däck denna session
            </span>
          ) : undefined
        }
      />

      <div className="page">
        <div className="grid grid-main">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save(true)
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void save(true)
              }
            }}
          >
            <Card title="Däckuppgifter">
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  <IconWarning size={16} />
                  <span>{error}</span>
                </div>
              )}

              <TireFormFields
                ref={brandRef}
                values={values}
                errors={errors}
                locations={facets.data?.locations ?? []}
                currency={settings.currency}
                onChange={setValues}
              />

              <div className="divider" />

              <div className="row-between">
                <span className="dim" style={{ fontSize: 12.5 }}>
                  <kbd>Ctrl</kbd> + <kbd>Enter</kbd> sparar och rensar för nästa däck
                </span>
                <div className="row">
                  <Button
                    onClick={() => {
                      setValues(emptyForm(settings))
                      setErrors({})
                      setError(null)
                      brandRef.current?.focus()
                    }}
                    disabled={saving}
                  >
                    Rensa
                  </Button>
                  <Button onClick={() => void save(false)} loading={saving} disabled={saving}>
                    Spara
                  </Button>
                  <Button type="submit" variant="primary" icon={<IconPlus size={16} />} loading={saving}>
                    Spara och lägg till nästa
                  </Button>
                </div>
              </div>
            </Card>
          </form>

          <Card title="Registrerat nu">
            {sessionItems.length === 0 ? (
              <EmptyState
                icon={<IconTire size={22} />}
                title="Inget registrerat ännu"
                text="Däck du lägger till hamnar här så att du snabbt kan kontrollera eller ångra."
              />
            ) : (
              <div className="stack-8">
                {sessionItems.map((item) => (
                  <div
                    key={item.id}
                    className="row-between"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{productLabel(item)}</span>
                        <SeasonBadge season={item.season} />
                      </div>
                      <div className="dim mono" style={{ fontSize: 11.5, marginTop: 3 }}>
                        {item.size} · {item.quantity} st ·{' '}
                        {formatCurrency(item.sellingPrice, settings.currency)} ·{' '}
                        {formatRelative(item.createdAt)}
                      </div>
                    </div>
                    <IconButton
                      label="Ångra"
                      icon={<IconTrash size={15} />}
                      onClick={() => void undo(item)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
