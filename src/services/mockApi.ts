import {
  DEMO_PRODUCTS,
  DEMO_HISTORY_DAYS,
  DEMO_SALES_SEED,
  createRandom,
  parseDimension,
} from '@shared/demoData'
import { DEFAULT_SETTINGS, TIRE_CATEGORIES } from '@shared/constants'
import type {
  ApiResult,
  AppSettings,
  CategoryCount,
  DashboardStats,
  Product,
  ProductDraft,
  ProductFilters,
  Sale,
  SaleDraft,
  SaleFilters,
  Season,
} from '@shared/types'
import type { DesktopApi } from '../../electron/preload'

/**
 * Mockdata för webbförhandsvisning.
 *
 * Appen är byggd som ett skrivbordsprogram och all riktig data ligger i SQLite
 * i Electrons huvudprocess. Öppnar man Vite-adressen i en vanlig webbläsare
 * finns ingen IPC-brygga — då används det här minnesläget istället, så att
 * gränssnittet går att granska utan att starta hela skrivbordsappen.
 */

const ok = <T>(data: T): Promise<ApiResult<T>> => Promise.resolve({ ok: true, data })
const fail = <T>(error: string): Promise<ApiResult<T>> => Promise.resolve({ ok: false, error })

const TREND_DAYS = 14
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function createMockApi(): DesktopApi {
  const now = new Date()
  let products: Product[] = DEMO_PRODUCTS.map((item, index) => {
    const dimension = parseDimension(item.size)
    const created = new Date(now.getTime() - (DEMO_PRODUCTS.length - index) * 36e5 * 12).toISOString()
    return {
      id: index + 1,
      sku: `DB-${String(index + 1).padStart(5, '0')}`,
      brand: item.brand,
      model: item.model,
      size: item.size,
      width: dimension.width,
      profile: dimension.profile,
      rim: dimension.rim,
      season: item.season,
      tireType: item.tireType,
      studded: item.studded,
      condition: item.condition,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      location: item.location,
      notes: item.notes ?? '',
      lowStockThreshold: 4,
      createdAt: created,
      updatedAt: created,
    }
  })

  let sales: Sale[] = buildSalesHistory(products, now)
  let settings: AppSettings = { ...DEFAULT_SETTINGS }
  let nextProductId = products.length + 1
  let nextSaleId = sales.length + 1

  const findProduct = (id: number) => products.find((product) => product.id === id)

  return {
    products: {
      list: (filters: ProductFilters = {}) => ok(clone(applyFilters(products, filters))),
      get: (id: number) => ok(clone(findProduct(id) ?? null)),
      create: (draft: ProductDraft) => {
        const dimension = parseDimension(draft.size)
        const timestamp = new Date().toISOString()
        const product: Product = {
          ...draft,
          id: nextProductId,
          sku: draft.sku?.trim() || `DB-${String(nextProductId).padStart(5, '0')}`,
          width: draft.width ?? dimension.width,
          profile: draft.profile ?? dimension.profile,
          rim: draft.rim ?? dimension.rim,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        nextProductId += 1
        products = [product, ...products]
        return ok(clone(product))
      },
      update: (id: number, draft: ProductDraft) => {
        const existing = findProduct(id)
        if (!existing) return fail<Product>('Produkten hittades inte.')
        const updated: Product = { ...existing, ...draft, id, updatedAt: new Date().toISOString() }
        products = products.map((product) => (product.id === id ? updated : product))
        return ok(clone(updated))
      },
      remove: (id: number) => {
        products = products.filter((product) => product.id !== id)
        return ok(true)
      },
      adjust: (id: number, delta: number) => {
        const existing = findProduct(id)
        if (!existing) return fail<Product>('Produkten hittades inte.')
        if (existing.quantity + delta < 0) return fail<Product>('Lagersaldot kan inte bli negativt.')
        const updated = {
          ...existing,
          quantity: existing.quantity + delta,
          updatedAt: new Date().toISOString(),
        }
        products = products.map((product) => (product.id === id ? updated : product))
        return ok(clone(updated))
      },
      categoryCounts: () => ok(buildCategoryCounts(products)),
      facets: () =>
        ok({
          brands: unique(products.map((product) => product.brand)).sort((a, b) => a.localeCompare(b, 'sv')),
          sizes: unique(products.map((product) => product.size)).sort((a, b) => a.localeCompare(b, 'sv')),
          locations: unique(products.map((product) => product.location).filter(Boolean)).sort((a, b) =>
            a.localeCompare(b, 'sv')
          ),
        }),
    },
    sales: {
      list: (filters: SaleFilters = {}) => ok(clone(filterSales(sales, filters))),
      create: (draft: SaleDraft) => {
        const product = findProduct(draft.productId)
        if (!product) return fail<Sale>('Produkten hittades inte.')
        if (draft.quantity > product.quantity) {
          return fail<Sale>(`Det finns bara ${product.quantity} st i lager av ${product.brand} ${product.model}.`)
        }
        const sale: Sale = {
          id: nextSaleId,
          productId: product.id,
          sku: product.sku,
          brand: product.brand,
          model: product.model,
          size: product.size,
          season: product.season,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          unitPurchasePrice: product.purchasePrice,
          total: draft.unitPrice * draft.quantity,
          profit: (draft.unitPrice - product.purchasePrice) * draft.quantity,
          soldAt: new Date().toISOString(),
          note: draft.note ?? '',
        }
        nextSaleId += 1
        sales = [sale, ...sales]
        products = products.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity - draft.quantity } : item
        )
        return ok(clone(sale))
      },
      remove: (id: number) => {
        const sale = sales.find((item) => item.id === id)
        if (sale?.productId) {
          products = products.map((product) =>
            product.id === sale.productId
              ? { ...product, quantity: product.quantity + sale.quantity }
              : product
          )
        }
        sales = sales.filter((item) => item.id !== id)
        return ok(true)
      },
    },
    dashboard: {
      stats: () => ok(clone(buildStats(products, sales))),
    },
    settings: {
      get: () => ok(clone(settings)),
      save: (patch: Partial<AppSettings>) => {
        settings = { ...settings, ...patch }
        return ok(clone(settings))
      },
      pickLogo: () => fail<string | null>('Logotyp kan bara väljas i skrivbordsappen.'),
      pickFolder: () => fail<string | null>('Mappval fungerar bara i skrivbordsappen.'),
    },
    backup: {
      create: () => ok({ status: 'error' as const, message: 'Backup kräver skrivbordsappen.' }),
      pickRestore: () => ok({ status: 'invalid' as const, message: 'Återställning kräver skrivbordsappen.' }),
      confirmRestore: () => ok({ status: 'error' as const, message: 'Återställning kräver skrivbordsappen.' }),
    },
    app: {
      info: () =>
        ok({
          version: '1.0.0',
          databasePath: 'Minnesläge (webbförhandsvisning)',
          userDataPath: '—',
          platform: 'web',
          isPackaged: false,
        }),
      resetDemoData: () => fail<boolean>('Nollställning kräver skrivbordsappen.'),
      clearDatabase: () => fail<boolean>('Tömning kräver skrivbordsappen.'),
    },
  }
}

const unique = <T>(values: T[]): T[] => Array.from(new Set(values))

function buildCategoryCounts(products: Product[]): CategoryCount[] {
  return TIRE_CATEGORIES.map((category) => {
    const matching = products.filter((product) =>
      category.id === 'vinterdack' ? product.season === 'vinter' : product.tireType === category.id
    )
    return {
      id: category.id,
      products: matching.length,
      quantity: matching.reduce((sum, product) => sum + product.quantity, 0),
      value: matching.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0),
    }
  })
}

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  const term = filters.search?.trim().toLowerCase() ?? ''

  const filtered = products.filter((product) => {
    if (
      term &&
      ![product.brand, product.model, product.size, product.sku, product.location]
        .join(' ')
        .toLowerCase()
        .includes(term)
    ) {
      return false
    }
    if (filters.season && filters.season !== 'all' && product.season !== filters.season) return false
    if (filters.brand && filters.brand !== 'all' && product.brand !== filters.brand) return false
    if (filters.size && filters.size !== 'all' && product.size !== filters.size) return false
    if (filters.category && filters.category !== 'all') {
      const matches =
        filters.category === 'vinterdack'
          ? product.season === 'vinter'
          : product.tireType === filters.category
      if (!matches) return false
    }
    if (filters.condition && filters.condition !== 'all' && product.condition !== filters.condition) return false
    if (filters.studded === 'studded' && !product.studded) return false
    if (filters.studded === 'friction' && product.studded) return false
    if (filters.stockLevel === 'in-stock' && product.quantity <= 0) return false
    if (filters.stockLevel === 'out' && product.quantity > 0) return false
    if (filters.stockLevel === 'low' && !(product.quantity > 0 && product.quantity <= product.lowStockThreshold)) {
      return false
    }
    return true
  })

  const field = filters.sortBy ?? 'updatedAt'
  const direction = filters.sortDir === 'asc' ? 1 : -1

  return [...filtered].sort((a, b) => {
    const left = a[field as keyof Product]
    const right = b[field as keyof Product]
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
    return String(left).localeCompare(String(right), 'sv') * direction
  })
}

function filterSales(sales: Sale[], filters: SaleFilters): Sale[] {
  const term = filters.search?.trim().toLowerCase() ?? ''
  return sales
    .filter((sale) => {
      if (term && ![sale.brand, sale.model, sale.size, sale.sku].join(' ').toLowerCase().includes(term)) {
        return false
      }
      if (filters.from && sale.soldAt < `${filters.from}T00:00:00.000Z`) return false
      if (filters.to && sale.soldAt > `${filters.to}T23:59:59.999Z`) return false
      return true
    })
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt))
    .slice(0, filters.limit ?? 500)
}

function buildSalesHistory(products: Product[], now: Date): Sale[] {
  const random = createRandom(DEMO_SALES_SEED)
  const history: Sale[] = []
  let id = 1

  for (let dayOffset = DEMO_HISTORY_DAYS; dayOffset >= 0; dayOffset--) {
    const date = new Date(now)
    date.setDate(date.getDate() - dayOffset)
    if (date.getDay() === 0) continue

    const saleCount = (date.getDay() === 6 ? 1 : 2) + Math.floor(random() * 3)
    for (let index = 0; index < saleCount; index++) {
      const product = products[Math.floor(random() * products.length)]
      const quantity = random() > 0.75 ? 2 : 4
      const discount = random() > 0.8 ? Math.round(product.sellingPrice * 0.05) : 0
      const unitPrice = Math.max(0, product.sellingPrice - discount)
      const soldAt = new Date(date)
      soldAt.setHours(8 + Math.floor(random() * 9), Math.floor(random() * 60), 0, 0)

      history.push({
        id: id++,
        productId: product.id,
        sku: product.sku,
        brand: product.brand,
        model: product.model,
        size: product.size,
        season: product.season,
        quantity,
        unitPrice,
        unitPurchasePrice: product.purchasePrice,
        total: unitPrice * quantity,
        profit: (unitPrice - product.purchasePrice) * quantity,
        soldAt: soldAt.toISOString(),
        note: discount > 0 ? 'Kampanjpris' : '',
      })
    }
  }

  return history.sort((a, b) => b.soldAt.localeCompare(a.soldAt))
}

function buildStats(products: Product[], sales: Sale[]): DashboardStats {
  const inventoryValue = products.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0)
  const salesValue = products.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0)
  const today = dayKey(new Date())
  const month = today.slice(0, 7)

  const todaySales = sales.filter((sale) => dayKey(new Date(sale.soldAt)) === today)
  const monthSales = sales.filter((sale) => dayKey(new Date(sale.soldAt)).startsWith(month))

  const trend: DashboardStats['salesTrend'] = []
  for (let offset = TREND_DAYS - 1; offset >= 0; offset--) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = dayKey(date)
    const daySales = sales.filter((sale) => dayKey(new Date(sale.soldAt)) === key)
    trend.push({
      date: key,
      revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
      quantity: daySales.reduce((sum, sale) => sum + sale.quantity, 0),
    })
  }

  const seasons: Season[] = ['sommar', 'vinter', 'helar']
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const topMap = new Map<string, { quantity: number; revenue: number }>()
  for (const sale of sales) {
    if (new Date(sale.soldAt) < cutoff) continue
    const label = `${sale.brand} ${sale.model}`
    const entry = topMap.get(label) ?? { quantity: 0, revenue: 0 }
    topMap.set(label, { quantity: entry.quantity + sale.quantity, revenue: entry.revenue + sale.total })
  }

  return {
    inventory: {
      totalProducts: products.length,
      totalTires: products.reduce((sum, item) => sum + item.quantity, 0),
      lowStockCount: products.filter((item) => item.quantity > 0 && item.quantity <= item.lowStockThreshold)
        .length,
      outOfStockCount: products.filter((item) => item.quantity <= 0).length,
      inventoryValue,
      estimatedSalesValue: salesValue,
      estimatedProfit: salesValue - inventoryValue,
    },
    soldToday: todaySales.reduce((sum, sale) => sum + sale.quantity, 0),
    revenueToday: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    profitToday: todaySales.reduce((sum, sale) => sum + sale.profit, 0),
    revenueMonth: monthSales.reduce((sum, sale) => sum + sale.total, 0),
    profitMonth: monthSales.reduce((sum, sale) => sum + sale.profit, 0),
    salesTrend: trend,
    seasonSplit: seasons.map((season) => ({
      season,
      quantity: products
        .filter((product) => product.season === season)
        .reduce((sum, product) => sum + product.quantity, 0),
    })),
    categoryCounts: buildCategoryCounts(products),
    topProducts: [...topMap.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    lowStock: products
      .filter((product) => product.quantity > 0 && product.quantity <= product.lowStockThreshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8),
    recentSales: sales.slice(0, 8),
  }
}
