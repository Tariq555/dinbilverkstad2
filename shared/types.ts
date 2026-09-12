/**
 * Delade typer mellan Electrons huvudprocess och React-gränssnittet.
 * Ändras något här gäller det båda sidor av IPC-bryggan.
 */

export type Season = 'sommar' | 'vinter' | 'helar'
export type Condition = 'ny' | 'begagnad'

export type TireCategoryId =
  | 'sommardack'
  | 'vinterdack'
  | 'dubbdack'
  | 'friktionsdack'
  | 'ms-dack'

export interface TireCategory {
  readonly id: TireCategoryId
  readonly label: string
  /** Kort etikett för trånga ytor, t.ex. tabellceller och diagram. */
  readonly short: string
  readonly season: Season
  readonly studded: boolean
  readonly description: string
}

export interface Product {
  id: number
  sku: string
  brand: string
  model: string
  size: string
  width: number | null
  profile: number | null
  rim: number | null
  season: Season
  /** Däckkategori — se TIRE_CATEGORIES. Lagras i kolumnen tire_type. */
  tireType: TireCategoryId
  studded: boolean
  condition: Condition
  quantity: number
  purchasePrice: number
  sellingPrice: number
  location: string
  notes: string
  lowStockThreshold: number
  createdAt: string
  updatedAt: string
}

export type ProductDraft = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku'> & {
  sku?: string
}

export interface Sale {
  id: number
  productId: number | null
  sku: string
  brand: string
  model: string
  size: string
  season: Season
  quantity: number
  unitPrice: number
  unitPurchasePrice: number
  total: number
  profit: number
  soldAt: string
  note: string
}

export interface SaleDraft {
  productId: number
  quantity: number
  unitPrice: number
  note?: string
}

export type StockLevel = 'all' | 'in-stock' | 'low' | 'out'

export interface ProductFilters {
  search?: string
  season?: Season | 'all'
  brand?: string | 'all'
  size?: string | 'all'
  /** Filtrerar på däckkategori. 'vinterdack' omfattar dubb och friktion. */
  category?: TireCategoryId | 'all'
  condition?: Condition | 'all'
  studded?: 'all' | 'studded' | 'friction'
  stockLevel?: StockLevel
  sortBy?: ProductSortField
  sortDir?: 'asc' | 'desc'
}

export type ProductSortField =
  | 'brand'
  | 'model'
  | 'size'
  | 'season'
  | 'quantity'
  | 'purchasePrice'
  | 'sellingPrice'
  | 'location'
  | 'updatedAt'

export interface SaleFilters {
  search?: string
  from?: string
  to?: string
  limit?: number
}

export interface InventorySummary {
  totalProducts: number
  totalTires: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  estimatedSalesValue: number
  estimatedProfit: number
}

export interface DashboardStats {
  inventory: InventorySummary
  soldToday: number
  revenueToday: number
  profitToday: number
  revenueMonth: number
  profitMonth: number
  salesTrend: { date: string; revenue: number; quantity: number }[]
  seasonSplit: { season: Season; quantity: number }[]
  topProducts: { label: string; quantity: number; revenue: number }[]
  categoryCounts: CategoryCount[]
  lowStock: Product[]
  recentSales: Sale[]
}

export interface CategoryCount {
  id: TireCategoryId
  products: number
  quantity: number
  value: number
}

export interface AppSettings {
  shopName: string
  shopLogo: string
  currency: string
  defaultPurchasePrice: number
  defaultSellingPrice: number
  defaultLocation: string
  defaultQuantity: number
  lowStockThreshold: number
  backupFolder: string
  autoBackupOnExit: boolean
}

export interface BackupResult {
  status: 'ok' | 'cancelled' | 'error'
  path?: string
  message?: string
}

export interface RestorePreview {
  status: 'ok' | 'cancelled' | 'invalid'
  path?: string
  products?: number
  sales?: number
  message?: string
}

export interface AppInfo {
  version: string
  databasePath: string
  userDataPath: string
  platform: string
  isPackaged: boolean
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
