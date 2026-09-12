import type { DashboardStats, InventorySummary, Product, Season } from '@shared/types'
import { getDatabase } from '../db'
import { getCategoryCounts, listProducts } from './productRepository'
import { listSales } from './salesRepository'

const TREND_DAYS = 14
const TOP_PRODUCT_WINDOW_DAYS = 30
const RECENT_SALES_LIMIT = 8
const LOW_STOCK_LIMIT = 8

export function getInventorySummary(): InventorySummary {
  const db = getDatabase()
  const row = db.one<{
    total_products: number
    total_tires: number
    low_stock: number
    out_of_stock: number
    inventory_value: number
    sales_value: number
  }>(`
    SELECT
      COUNT(*)                                                            AS total_products,
      COALESCE(SUM(quantity), 0)                                          AS total_tires,
      COALESCE(SUM(CASE WHEN quantity > 0 AND quantity <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS low_stock,
      COALESCE(SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END), 0)         AS out_of_stock,
      COALESCE(SUM(quantity * purchase_price), 0)                         AS inventory_value,
      COALESCE(SUM(quantity * selling_price), 0)                          AS sales_value
    FROM products
  `)

  const inventoryValue = row?.inventory_value ?? 0
  const salesValue = row?.sales_value ?? 0

  return {
    totalProducts: row?.total_products ?? 0,
    totalTires: row?.total_tires ?? 0,
    lowStockCount: row?.low_stock ?? 0,
    outOfStockCount: row?.out_of_stock ?? 0,
    inventoryValue,
    estimatedSalesValue: salesValue,
    estimatedProfit: salesValue - inventoryValue,
  }
}

export function getDashboardStats(): DashboardStats {
  const db = getDatabase()

  const today = db.one<{ quantity: number; revenue: number; profit: number }>(`
    SELECT
      COALESCE(SUM(quantity), 0) AS quantity,
      COALESCE(SUM(total), 0)    AS revenue,
      COALESCE(SUM(profit), 0)   AS profit
    FROM sales
    WHERE date(sold_at, 'localtime') = date('now', 'localtime')
  `)

  const month = db.one<{ revenue: number; profit: number }>(`
    SELECT
      COALESCE(SUM(total), 0)  AS revenue,
      COALESCE(SUM(profit), 0) AS profit
    FROM sales
    WHERE strftime('%Y-%m', sold_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `)

  const trendRows = db.all<{ day: string; revenue: number; quantity: number }>(
    `
    SELECT
      date(sold_at, 'localtime') AS day,
      COALESCE(SUM(total), 0)    AS revenue,
      COALESCE(SUM(quantity), 0) AS quantity
    FROM sales
    WHERE date(sold_at, 'localtime') >= date('now', 'localtime', ?)
    GROUP BY day
    ORDER BY day
  `,
    [`-${TREND_DAYS - 1} days`]
  )

  const seasonRows = db.all<{ season: string; quantity: number }>(`
    SELECT season, COALESCE(SUM(quantity), 0) AS quantity
    FROM products
    GROUP BY season
  `)

  const topRows = db.all<{ label: string; quantity: number; revenue: number }>(
    `
    SELECT
      brand || ' ' || model      AS label,
      COALESCE(SUM(quantity), 0) AS quantity,
      COALESCE(SUM(total), 0)    AS revenue
    FROM sales
    WHERE date(sold_at, 'localtime') >= date('now', 'localtime', ?)
    GROUP BY label
    ORDER BY quantity DESC
    LIMIT 5
  `,
    [`-${TOP_PRODUCT_WINDOW_DAYS} days`]
  )

  return {
    inventory: getInventorySummary(),
    soldToday: today?.quantity ?? 0,
    revenueToday: today?.revenue ?? 0,
    profitToday: today?.profit ?? 0,
    revenueMonth: month?.revenue ?? 0,
    profitMonth: month?.profit ?? 0,
    salesTrend: fillTrendGaps(trendRows),
    seasonSplit: seasonRows.map((row) => ({ season: row.season as Season, quantity: row.quantity })),
    topProducts: topRows,
    categoryCounts: getCategoryCounts(),
    lowStock: getLowStockProducts(),
    recentSales: listSales({ limit: RECENT_SALES_LIMIT }),
  }
}

export function getLowStockProducts(): Product[] {
  return listProducts({ stockLevel: 'low', sortBy: 'quantity', sortDir: 'asc' }).slice(0, LOW_STOCK_LIMIT)
}

/** Dagar utan försäljning ska synas som nollstaplar, inte försvinna ur diagrammet. */
function fillTrendGaps(rows: { day: string; revenue: number; quantity: number }[]) {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const result: { date: string; revenue: number; quantity: number }[] = []
  const today = new Date()

  for (let offset = TREND_DAYS - 1; offset >= 0; offset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`
    const match = byDay.get(key)
    result.push({ date: key, revenue: match?.revenue ?? 0, quantity: match?.quantity ?? 0 })
  }
  return result
}
