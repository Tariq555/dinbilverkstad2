import { useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button, IconButton } from '@/components/ui/Button'
import { SeasonBadge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorBlock, TableSkeleton } from '@/components/ui/EmptyState'
import { TextInput } from '@/components/ui/Field'
import { IconHistory, IconSale, IconSearch, IconTrash, IconTrend, IconWallet } from '@/components/ui/Icons'
import { api, errorMessage } from '@/services/api'
import { useAsync, useDebounced } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import { formatCurrency, formatDateTime, formatNumber, toDateInputValue } from '@/utils/format'
import { productLabel } from '@/utils/tire'
import type { Sale } from '@/types'

type RangePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Idag' },
  { value: 'week', label: '7 dagar' },
  { value: 'month', label: '30 dagar' },
  { value: 'year', label: 'I år' },
]

function rangeFor(preset: RangePreset): { from: string; to: string } {
  const today = new Date()
  const to = toDateInputValue(today)
  const from = new Date(today)

  if (preset === 'week') from.setDate(from.getDate() - 6)
  if (preset === 'month') from.setDate(from.getDate() - 29)
  if (preset === 'year') from.setMonth(0, 1)

  return { from: toDateInputValue(from), to }
}

/** Försäljningshistorik med datumfilter, summeringar och möjlighet att ångra. */
export function HistoryPage() {
  const { settings, revision, refresh } = useApp()
  const toast = useToast()

  const [preset, setPreset] = useState<RangePreset>('month')
  const [range, setRange] = useState(() => rangeFor('month'))
  const [search, setSearch] = useState('')
  const [pendingUndo, setPendingUndo] = useState<Sale | null>(null)
  const [undoing, setUndoing] = useState(false)

  const debouncedSearch = useDebounced(search)

  const query = useMemo(
    () => ({ search: debouncedSearch, from: range.from, to: range.to, limit: 1000 }),
    [debouncedSearch, range]
  )

  const sales = useAsync(() => api.listSales(query), [query, revision])
  const items = sales.data ?? []

  const totals = useMemo(
    () => ({
      quantity: items.reduce((sum, sale) => sum + sale.quantity, 0),
      revenue: items.reduce((sum, sale) => sum + sale.total, 0),
      profit: items.reduce((sum, sale) => sum + sale.profit, 0),
    }),
    [items]
  )

  const selectPreset = (value: RangePreset) => {
    setPreset(value)
    setRange(rangeFor(value))
  }

  const handleUndo = async () => {
    if (!pendingUndo) return
    setUndoing(true)
    try {
      await api.deleteSale(pendingUndo.id)
      toast.success('Försäljningen ångrad', `${pendingUndo.quantity} st lades tillbaka i lagret.`)
      setPendingUndo(null)
      refresh()
    } catch (caught) {
      toast.error('Kunde inte ångra försäljningen', errorMessage(caught))
    } finally {
      setUndoing(false)
    }
  }

  return (
    <>
      <Topbar
        title="Historik"
        subtitle={`${formatNumber(items.length)} försäljningar i vald period`}
      />

      <div className="page stack-16">
        <div className="grid grid-3">
          <StatCard
            label="Sålda däck"
            value={formatNumber(totals.quantity)}
            unit="st"
            icon={<IconSale size={17} />}
            tone="accent"
          />
          <StatCard
            label="Omsättning"
            value={formatCurrency(totals.revenue, settings.currency)}
            icon={<IconTrend size={17} />}
            tone="success"
          />
          <StatCard
            label="Beräknad vinst"
            value={formatCurrency(totals.profit, settings.currency)}
            icon={<IconWallet size={17} />}
            tone="info"
            footer={
              totals.revenue > 0
                ? `Marginal ${((totals.profit / totals.revenue) * 100).toFixed(0)} %`
                : undefined
            }
          />
        </div>

        <div className="filter-bar">
          <div className="segmented">
            {PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={preset === item.value}
                onClick={() => selectPreset(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="row" style={{ gap: 8 }}>
            <TextInput
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => {
                setPreset('custom')
                setRange((current) => ({ ...current, from: event.target.value }))
              }}
              aria-label="Från datum"
              style={{ width: 150 }}
            />
            <span className="dim">–</span>
            <TextInput
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => {
                setPreset('custom')
                setRange((current) => ({ ...current, to: event.target.value }))
              }}
              aria-label="Till datum"
              style={{ width: 150 }}
            />
          </div>

          <div className="search" style={{ flex: '1 1 220px' }}>
            <IconSearch size={16} />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sök produkt…"
              aria-label="Sök i historiken"
            />
          </div>
        </div>

        {sales.error && <ErrorBlock message={sales.error} onRetry={sales.reload} />}

        <Card padded={false}>
          {sales.loading && items.length === 0 && <TableSkeleton />}

          {!sales.loading && items.length === 0 && !sales.error && (
            <EmptyState
              icon={<IconHistory size={24} />}
              title="Inga försäljningar i perioden"
              text="Byt datumintervall eller registrera en försäljning."
              action={<Button onClick={() => selectPreset('year')}>Visa hela året</Button>}
            />
          )}

          {items.length > 0 && (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data wide">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Produkt</th>
                    <th className="right">Antal</th>
                    <th className="right">Pris/st</th>
                    <th className="right">Totalt</th>
                    <th className="right">Beräknad vinst</th>
                    <th>Notering</th>
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((sale) => (
                    <tr key={sale.id}>
                      <td className="muted num nowrap">{formatDateTime(sale.soldAt)}</td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="cell-strong">{productLabel(sale)}</span>
                          <SeasonBadge season={sale.season} />
                        </div>
                        <div className="cell-sub mono">
                          {sale.size} · {sale.sku}
                        </div>
                      </td>
                      <td className="right num">{sale.quantity} st</td>
                      <td className="right num muted">
                        {formatCurrency(sale.unitPrice, settings.currency)}
                      </td>
                      <td className="right num cell-strong">
                        {formatCurrency(sale.total, settings.currency)}
                      </td>
                      <td
                        className="right num"
                        style={{ color: sale.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}
                      >
                        {formatCurrency(sale.profit, settings.currency)}
                      </td>
                      <td className="muted">{sale.note || '—'}</td>
                      <td className="col-actions">
                        <IconButton
                          label="Ångra försäljning"
                          icon={<IconTrash size={15} />}
                          onClick={() => setPendingUndo(sale)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 620 }}>
                      Summa
                    </td>
                    <td className="right num" style={{ fontWeight: 620 }}>
                      {formatNumber(totals.quantity)} st
                    </td>
                    <td />
                    <td className="right num" style={{ fontWeight: 680 }}>
                      {formatCurrency(totals.revenue, settings.currency)}
                    </td>
                    <td className="right num" style={{ fontWeight: 680, color: 'var(--success)' }}>
                      {formatCurrency(totals.profit, settings.currency)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingUndo)}
        title="Ångra försäljningen?"
        destructive
        busy={undoing}
        confirmLabel="Ångra försäljning"
        message={
          pendingUndo ? (
            <>
              Försäljningen av{' '}
              <strong style={{ color: 'var(--text)' }}>
                {pendingUndo.quantity} st {productLabel(pendingUndo)}
              </strong>{' '}
              tas bort ur historiken och däcken läggs tillbaka i lagret.
            </>
          ) : (
            ''
          )
        }
        onConfirm={handleUndo}
        onCancel={() => setPendingUndo(null)}
      />
    </>
  )
}
