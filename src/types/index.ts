export type {
  ApiResult,
  AppInfo,
  AppSettings,
  BackupResult,
  CategoryCount,
  Condition,
  DashboardStats,
  InventorySummary,
  Product,
  ProductDraft,
  ProductFilters,
  ProductSortField,
  RestorePreview,
  Sale,
  SaleDraft,
  SaleFilters,
  Season,
  StockLevel,
  TireCategory,
  TireCategoryId,
} from '@shared/types'

export type StockStatus = 'in-stock' | 'low' | 'out'

export type PageId =
  | 'dashboard'
  | 'lager'
  | 'dack'
  | 'forsaljning'
  | 'historik'
  | 'installningar'
