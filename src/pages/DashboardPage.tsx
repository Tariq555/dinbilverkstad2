import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge, SeasonBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/EmptyState'
import { BarChart } from '@/components/charts/BarChart'
import { CategoryOverview } from '@/features/dashboard/CategoryOverview'
import { DonutChart } from '@/components/charts/DonutChart'
import {
  IconBox,
  IconInventory,
  IconPlus,
  IconRefresh,
  IconSale,
  IconTire,
  IconTrend,
  IconWallet,
  IconWarning,
} from '@/components/ui/Icons'
import { api } from '@/services/api'
import { useAsync } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatShortDay,
  formatTime,
  plural,
} from '@/utils/format'
import { productLabel, seasonColor, seasonLabel } from '@/utils/tire'

export function DashboardPage() {
  const { settings, revision, refresh, navigate, startSale } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.getDashboardStats(), [revision])

  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <>
            <Button icon={<IconRefresh size={15} />} onClick={refresh}>
              Uppdatera
            </Button>
            <Button variant="primary" icon={<IconSale size={16} />} onClick={() => startSale()}>
              Sälj
            </Button>
          </>
        }
      />

      <div className="page">
        {loading && !data && <LoadingBlock label="Hämtar lagerstatus…" />}
        {error && <ErrorBlock message={error} onRetry={reload} />}

        {data && (
          <div className="stack-16">
            <div className="grid grid-5">
              <StatCard
                label="Lager"
                value={formatNumber(data.inventory.totalTires)}
                unit="däck"
                icon={<IconBox size={17} />}
                tone="accent"
                footer={plural(data.inventory.totalProducts, 'artikel', 'artiklar')}
                onClick={() => navigate('lager')}
              />
              <StatCard
                label="Sålda idag"
                value={formatNumber(data.soldToday)}
                unit="st"
                icon={<IconSale size={17} />}
                tone="info"
                footer={`Vinst ${formatCurrency(data.profitToday, settings.currency)}`}
                onClick={() => navigate('historik')}
              />
              <StatCard
                label="Försäljning idag"
                value={formatCurrency(data.revenueToday, settings.currency)}
                icon={<IconTrend size={17} />}
                tone="success"
                footer={`Denna månad ${formatCompactCurrency(data.revenueMonth, settings.currency)}`}
                onClick={() => navigate('historik')}
              />
              <StatCard
                label="Lågt lager"
                value={formatNumber(data.inventory.lowStockCount)}
                unit={data.inventory.lowStockCount === 1 ? 'artikel' : 'artiklar'}
                icon={<IconWarning size={17} />}
                tone={data.inventory.lowStockCount > 0 ? 'warning' : 'default'}
                footer={
                  data.inventory.outOfStockCount > 0
                    ? `${data.inventory.outOfStockCount} slut i lager`
                    : 'Inget slut i lager'
                }
                onClick={() => navigate('lager')}
              />
              <StatCard
                label="Lagervärde"
                value={formatCompactCurrency(data.inventory.inventoryValue, settings.currency)}
                icon={<IconWallet size={17} />}
                footer={`Säljvärde ${formatCompactCurrency(
                  data.inventory.estimatedSalesValue,
                  settings.currency
                )}`}
              />
            </div>

            <Card
              title="Däck i lager per typ"
              action={
                <span className="dim" style={{ fontSize: 12.5 }}>
                  Klicka för att visa i lagret
                </span>
              }
            >
              <CategoryOverview
                counts={data.categoryCounts}
                onSelect={(category) => navigate('lager', { category })}
              />
            </Card>

            <div className="grid grid-main">
              <Card
                title="Försäljning senaste 14 dagarna"
                action={
                  <span className="dim" style={{ fontSize: 12.5 }}>
                    Totalt{' '}
                    {formatCurrency(
                      data.salesTrend.reduce((sum, day) => sum + day.revenue, 0),
                      settings.currency
                    )}
                  </span>
                }
              >
                {data.salesTrend.every((day) => day.revenue === 0) ? (
                  <EmptyState
                    icon={<IconTrend size={22} />}
                    title="Ingen försäljning ännu"
                    text="Så fort du registrerar en försäljning dyker den upp här."
                  />
                ) : (
                  <BarChart
                    data={data.salesTrend.map((day, index) => ({
                      label: formatShortDay(day.date).split(' ')[1],
                      secondary: formatShortDay(day.date),
                      value: day.revenue,
                      highlight: index === data.salesTrend.length - 1,
                    }))}
                    height={230}
                    formatValue={(value) => formatCurrency(value, settings.currency)}
                  />
                )}
              </Card>

              <Card title="Lager per säsong">
                <DonutChart
                  slices={data.seasonSplit
                    .filter((slice) => slice.quantity > 0)
                    .map((slice) => ({
                      label: seasonLabel(slice.season),
                      value: slice.quantity,
                      color: seasonColor(slice.season),
                    }))}
                  centerValue={formatNumber(data.inventory.totalTires)}
                  centerLabel="DÄCK TOTALT"
                />
              </Card>
            </div>

            <div className="grid grid-main">
              <Card
                title="Senaste försäljningar"
                padded={false}
                action={
                  <Button size="sm" variant="ghost" onClick={() => navigate('historik')}>
                    Visa historik
                  </Button>
                }
              >
                {data.recentSales.length === 0 ? (
                  <EmptyState
                    icon={<IconSale size={22} />}
                    title="Inga försäljningar registrerade"
                    text="Använd Sälj-knappen för att registrera den första försäljningen."
                    action={
                      <Button variant="primary" icon={<IconSale size={15} />} onClick={() => startSale()}>
                        Sälj däck
                      </Button>
                    }
                  />
                ) : (
                  <div className="table-wrap" style={{ border: 'none' }}>
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Tid</th>
                          <th>Produkt</th>
                          <th className="right">Antal</th>
                          <th className="right">Summa</th>
                          <th className="right">Vinst</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentSales.map((sale) => (
                          <tr key={sale.id}>
                            <td className="muted num nowrap">{formatTime(sale.soldAt)}</td>
                            <td>
                              <div className="row" style={{ gap: 8 }}>
                                <span className="cell-strong">{productLabel(sale)}</span>
                                <SeasonBadge season={sale.season} />
                              </div>
                              <div className="cell-sub mono">{sale.size}</div>
                            </td>
                            <td className="right num">{sale.quantity} st</td>
                            <td className="right num cell-strong">
                              {formatCurrency(sale.total, settings.currency)}
                            </td>
                            <td
                              className="right num"
                              style={{ color: sale.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
                              {formatCurrency(sale.profit, settings.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <div className="stack-16">
                <Card
                  title="Lågt lager"
                  action={
                    data.lowStock.length > 0 ? (
                      <Badge tone="warning">{data.lowStock.length}</Badge>
                    ) : undefined
                  }
                >
                  {data.lowStock.length === 0 ? (
                    <EmptyState
                      icon={<IconInventory size={22} />}
                      title="Allt är påfyllt"
                      text="Ingen artikel ligger under sin lagergräns."
                    />
                  ) : (
                    <div className="stack-16">
                      {data.lowStock.map((product) => (
                        <div key={product.id} className="stack-4">
                          <div className="row-between">
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                              {productLabel(product)}
                            </span>
                            <span className="num" style={{ fontWeight: 640, color: 'var(--warning)' }}>
                              {product.quantity} st
                            </span>
                          </div>
                          <div className="progress">
                            <span
                              style={{
                                width: `${Math.min(
                                  100,
                                  (product.quantity / Math.max(product.lowStockThreshold, 1)) * 100
                                )}%`,
                                background: 'var(--warning)',
                              }}
                            />
                          </div>
                          <div className="dim mono" style={{ fontSize: 11.5 }}>
                            {product.size} · gräns {product.lowStockThreshold} st
                          </div>
                        </div>
                      ))}
                      <Button block icon={<IconPlus size={15} />} onClick={() => navigate('dack')}>
                        Fyll på lagret
                      </Button>
                    </div>
                  )}
                </Card>

                <Card title="Mest sålda (30 dagar)">
                  {data.topProducts.length === 0 ? (
                    <EmptyState icon={<IconTire size={22} />} title="Ingen statistik ännu" />
                  ) : (
                    <div className="stack-16">
                      {data.topProducts.map((product, index) => (
                        <div key={product.label} className="rank-row">
                          <span className="rank-index">{index + 1}</span>
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 570,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {product.label}
                            </div>
                            <div className="progress" style={{ marginTop: 5 }}>
                              <span
                                style={{
                                  width: `${
                                    (product.quantity / Math.max(data.topProducts[0].quantity, 1)) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="num dim" style={{ fontSize: 12.5, minWidth: 42, textAlign: 'right' }}>
                            {product.quantity} st
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
