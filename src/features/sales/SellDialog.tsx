import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { CategoryBadge } from '@/features/dashboard/CategoryOverview'
import { IconSearch, IconWarning } from '@/components/ui/Icons'
import { api, errorMessage } from '@/services/api'
import { useToast } from '@/hooks/toastContext'
import { useApp } from '@/hooks/appContext'
import { formatCurrency, formatNumber } from '@/utils/format'
import { productLabel } from '@/utils/tire'
import type { Product } from '@/types'

interface SellDialogProps {
  open: boolean
  product: Product | null
  onClose: () => void
  onSold: () => void
}

const QUICK_QUANTITIES = [1, 2, 4]

/**
 * Säljflödet i två steg: fyll i antal och pris, granska summeringen och bekräfta.
 * Lagret minskas först när användaren bekräftat — och aldrig under noll.
 */
export function SellDialog({ open, product, onClose, onSold }: SellDialogProps) {
  const toast = useToast()
  const { settings } = useApp()

  const [selected, setSelected] = useState<Product | null>(product)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [quantity, setQuantity] = useState('4')
  const [unitPrice, setUnitPrice] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const quantityRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSelected(product)
    setSearch('')
    setResults([])
    setQuantity(product ? String(Math.min(4, product.quantity)) : '4')
    setUnitPrice(product ? String(product.sellingPrice) : '')
    setNote('')
    setConfirming(false)
    setError(null)
  }, [open, product])

  useEffect(() => {
    if (!open || selected || search.trim().length < 1) {
      if (!selected) setResults([])
      return
    }
    let active = true
    api
      .listProducts({ search, stockLevel: 'in-stock', sortBy: 'brand', sortDir: 'asc' })
      .then((items) => {
        if (active) setResults(items.slice(0, 8))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [open, selected, search])

  useEffect(() => {
    if (selected) window.setTimeout(() => quantityRef.current?.select(), 40)
  }, [selected])

  const parsedQuantity = Number(quantity) || 0
  const parsedPrice = Number(unitPrice.replace(',', '.')) || 0

  const summary = useMemo(() => {
    if (!selected) return null
    const total = parsedPrice * parsedQuantity
    const profit = (parsedPrice - selected.purchasePrice) * parsedQuantity
    return { total, profit, remaining: selected.quantity - parsedQuantity }
  }, [selected, parsedPrice, parsedQuantity])

  const validationError = (() => {
    if (!selected) return 'Välj en produkt.'
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return 'Ange ett antal på minst 1.'
    if (parsedQuantity > selected.quantity)
      return `Det finns bara ${selected.quantity} st i lager.`
    if (parsedPrice < 0) return 'Priset kan inte vara negativt.'
    return null
  })()

  const handleConfirm = async () => {
    if (!selected || validationError) return
    setSaving(true)
    setError(null)
    try {
      await api.createSale({
        productId: selected.id,
        quantity: parsedQuantity,
        unitPrice: parsedPrice,
        note,
      })
      toast.success(
        'Försäljning registrerad',
        `${parsedQuantity} st ${productLabel(selected)} · ${formatCurrency(
          parsedPrice * parsedQuantity,
          settings.currency
        )}`
      )
      onSold()
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={confirming ? 'Bekräfta försäljning' : 'Sälj däck'}
      subtitle={
        confirming
          ? 'Kontrollera uppgifterna innan lagret uppdateras.'
          : selected
            ? `${productLabel(selected)} · ${selected.size}`
            : 'Sök fram produkten som ska säljas.'
      }
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <Button onClick={() => setConfirming(false)} disabled={saving}>
              Tillbaka
            </Button>
            <Button variant="primary" onClick={handleConfirm} loading={saving}>
              Bekräfta försäljning
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Avbryt</Button>
            <Button
              variant="primary"
              disabled={Boolean(validationError)}
              onClick={() => setConfirming(true)}
            >
              Fortsätt
            </Button>
          </>
        )
      }
    >
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <IconWarning size={16} />
          <span>{error}</span>
        </div>
      )}

      {!selected && (
        <div className="stack-8">
          <div className="search">
            <IconSearch size={16} />
            <TextInput
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sök märke, modell eller dimension…"
            />
          </div>

          {results.length === 0 && search.trim() !== '' && (
            <div className="muted" style={{ padding: '18px 4px', fontSize: 13 }}>
              Inga produkter i lager matchar sökningen.
            </div>
          )}

          <div className="stack-4">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn"
                style={{ justifyContent: 'space-between', height: 52, width: '100%' }}
                onClick={() => {
                  setSelected(item)
                  setQuantity(String(Math.min(4, item.quantity)))
                  setUnitPrice(String(item.sellingPrice))
                }}
              >
                <span className="col" style={{ alignItems: 'flex-start', gap: 1 }}>
                  <span style={{ fontWeight: 600 }}>{productLabel(item)}</span>
                  <span className="dim mono" style={{ fontSize: 12 }}>
                    {item.size} · {item.quantity} st i lager
                  </span>
                </span>
                <span className="num" style={{ fontWeight: 620 }}>
                  {formatCurrency(item.sellingPrice, settings.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && !confirming && (
        <div className="stack-16">
          <div className="card card-pad row-between" style={{ background: 'var(--surface-2)' }}>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <strong>{productLabel(selected)}</strong>
                <CategoryBadge id={selected.tireType} />
              </div>
              <div className="dim mono" style={{ fontSize: 12.5, marginTop: 3 }}>
                {selected.size} · {selected.sku} · {selected.location || 'Ingen placering'}
              </div>
            </div>
            <div className="right">
              <div className="label">I lager</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 680 }}>
                {formatNumber(selected.quantity)}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Antal" required error={validationError ?? undefined}>
              <div className="row" style={{ gap: 8 }}>
                <TextInput
                  ref={quantityRef}
                  type="number"
                  min={1}
                  max={selected.quantity}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="num"
                  large
                />
                <div className="segmented">
                  {QUICK_QUANTITIES.filter((value) => value <= selected.quantity).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={parsedQuantity === value}
                      onClick={() => setQuantity(String(value))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field
              label={`Pris per däck (${settings.currency === 'SEK' ? 'kr' : settings.currency})`}
              hint={`Ordinarie ${formatCurrency(selected.sellingPrice, settings.currency)}`}
            >
              <TextInput
                type="number"
                min={0}
                step={1}
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="num"
                large
              />
            </Field>

            <Field label="Notering" className="form-span-2">
              <TextInput
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Kund, kampanj, reg.nr…"
              />
            </Field>
          </div>

          {summary && !validationError && (
            <div className="card card-pad row-between" style={{ background: 'var(--surface-2)' }}>
              <div>
                <div className="label">Summa</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 680 }}>
                  {formatCurrency(summary.total, settings.currency)}
                </div>
              </div>
              <div className="right">
                <div className="label">Beräknad vinst</div>
                <div
                  className="num"
                  style={{
                    fontSize: 16,
                    fontWeight: 640,
                    color: summary.profit >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {formatCurrency(summary.profit, settings.currency)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && confirming && summary && (
        <div className="stack-16">
          <div className="card" style={{ background: 'var(--surface-2)' }}>
            <div className="card-body stack-8">
              <ConfirmRow label="Produkt" value={`${productLabel(selected)} · ${selected.size}`} />
              <ConfirmRow label="Antal" value={`${parsedQuantity} st`} />
              <ConfirmRow
                label="Pris per däck"
                value={formatCurrency(parsedPrice, settings.currency)}
              />
              <div className="divider" style={{ margin: '6px 0' }} />
              <ConfirmRow
                label="Att betala"
                value={formatCurrency(summary.total, settings.currency)}
                strong
              />
              <ConfirmRow
                label="Beräknad vinst"
                value={formatCurrency(summary.profit, settings.currency)}
                tone={summary.profit >= 0 ? 'var(--success)' : 'var(--danger)'}
              />
              <ConfirmRow label="Kvar i lager efter försäljning" value={`${summary.remaining} st`} />
            </div>
          </div>

          {summary.remaining <= selected.lowStockThreshold && (
            <div className="alert alert-warning">
              <IconWarning size={16} />
              <span>
                {summary.remaining === 0
                  ? 'Artikeln tar slut i lager efter den här försäljningen.'
                  : `Efter försäljningen finns bara ${summary.remaining} st kvar — under gränsen för lågt lager på ${selected.lowStockThreshold} st.`}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function ConfirmRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: string
}) {
  return (
    <div className="row-between">
      <span className="muted" style={{ fontSize: 13 }}>
        {label}
      </span>
      <span
        className="num"
        style={{ fontWeight: strong ? 680 : 600, fontSize: strong ? 18 : 14, color: tone }}
      >
        {value}
      </span>
    </div>
  )
}
