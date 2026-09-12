import { useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { StockBadge } from '@/components/ui/Badge'
import { CategoryBadge } from '@/features/dashboard/CategoryOverview'
import { EmptyState, ErrorBlock, TableSkeleton } from '@/components/ui/EmptyState'
import { Select, TextInput } from '@/components/ui/Field'
import { IconSale, IconSearch, IconTrend, IconWallet } from '@/components/ui/Icons'
import { api } from '@/services/api'
import { useAsync, useDebounced } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import { formatCurrency, formatNumber, formatTime } from '@/utils/format'
import { productLabel, stockStatus, SEASONS } from '@/utils/tire'
import type { Season } from '@/types'

/**
 * Säljvyn: sök fram däcket, klicka Sälj. Dagens siffror ligger överst så att
 * personalen ser direkt hur dagen går.
 */
export function SalesPage() {
  const { settings, revision, startSale } = useApp()
  const [search, setSearch] = useState('')
  const [season, setSeason] = useState<Season | 'all'>('all')
  const debouncedSearch = useDebounced(search)

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      season,
      stockLevel: 'in-stock' as const,
      sortBy: 'brand' as const,
      sortDir: 'asc' as const,
    }),
    [debouncedSearch, season]
  )

  const products = useAsync(() => api.listProducts(query), [query, revision])
  const stats = useAsync(() => api.getDashboardStats(), [revision])

  const items = products.data ?? []

  return (
    <>
      <Topbar
        title="Försäljning"
        subtitle="Sök fram däcket och registrera försäljningen"
        actions={
          <Button variant="primary" icon={<IconSale size={16} />} onClick={() => startSale()}>
            Ny försäljning
          </Button>
        }
      />

      <div className="page stack-16">
        <div className="grid grid-3">
          <StatCard
            label="Sålda idag"
            value={formatNumber(stats.data?.soldToday ?? 0)}
            unit="däck"
            icon={<IconSale size={17} />}
            tone="accent"
          />
          <StatCard
            label="Försäljning idag"
            value={formatCurrency(stats.data?.revenueToday ?? 0, settings.currency)}
            icon={<IconTrend size={17} />}
            tone="success"
          />
          <StatCard
            label="Vinst idag"
            value={formatCurrency(stats.data?.profitToday ?? 0, settings.currency)}
            icon={<IconWallet size={17} />}
            tone="info"
          />
        </div>

        <div className="filter-bar">
          <div className="search">
            <IconSearch size={16} />
            <TextInput
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sök märke, modell eller dimension…"
              aria-label="Sök produkt att sälja"
            />
          </div>
          <Select
            value={season}
            onChange={(event) => setSeason(event.target.value as Season | 'all')}
            aria-label="Säsong"
          >
            <option value="all">Alla säsonger</option>
            {SEASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <span className="dim grow right" style={{ fontSize: 12.5 }}>
            {items.length} artiklar i lager
          </span>
        </div>

        {products.error && <ErrorBlock message={products.error} onRetry={products.reload} />}

        <Card title="Tillgängliga däck" padded={false}>
          {products.loading && items.length === 0 && <TableSkeleton rows={5} />}

          {!products.loading && items.length === 0 && (
            <EmptyState
              icon={<IconSale size={24} />}
              title="Inga däck matchar sökningen"
              text="Endast artiklar med saldo i lager visas här."
            />
          )}

          {items.length > 0 && (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data wide">
                <thead>
                  <tr>
                    <th>Produkt</th>
                    <th>Dimension</th>
                    <th>Däcktyp</th>
                    <th className="right">I lager</th>
                    <th className="right">Pris</th>
                    <th>Placering</th>
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="cell-strong">{productLabel(product)}</div>
                        <div className="cell-sub mono">{product.sku}</div>
                      </td>
                      <td className="mono nowrap">{product.size}</td>
                      <td>
                        <CategoryBadge id={product.tireType} />
                      </td>
                      <td className="right">
                        <StockBadge status={stockStatus(product)} quantity={product.quantity} />
                      </td>
                      <td className="right num cell-strong">
                        {formatCurrency(product.sellingPrice, settings.currency)}
                      </td>
                      <td className="muted nowrap">{product.location || '—'}</td>
                      <td className="col-actions">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<IconSale size={14} />}
                          onClick={() => startSale(product)}
                        >
                          Sälj
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {stats.data && stats.data.recentSales.length > 0 && (
          <Card title="Senast sålt" padded={false}>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Tid</th>
                    <th>Produkt</th>
                    <th className="right">Antal</th>
                    <th className="right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.data.recentSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td className="muted num nowrap">{formatTime(sale.soldAt)}</td>
                      <td>
                        <span className="cell-strong">{productLabel(sale)}</span>
                        <span className="mono dim" style={{ marginLeft: 8, fontSize: 12 }}>
                          {sale.size}
                        </span>
                      </td>
                      <td className="right num">{sale.quantity} st</td>
                      <td className="right num cell-strong">
                        {formatCurrency(sale.total, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
