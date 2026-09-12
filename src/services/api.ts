import type {
  ApiResult,
  AppInfo,
  AppSettings,
  BackupResult,
  CategoryCount,
  DashboardStats,
  Product,
  ProductDraft,
  ProductFilters,
  RestorePreview,
  Sale,
  SaleDraft,
  SaleFilters,
} from '@/types'
import { createMockApi } from './mockApi'

/**
 * Enda vägen mellan React och databasen.
 *
 * I skrivbordsappen går allt via den säkra preload-bryggan (window.dinbilverkstad)
 * som i sin tur pratar med SQLite i huvudprocessen. Renderaren har aldrig direkt
 * tillgång till Node.js eller filsystemet.
 */

export const isDesktopApp = typeof window !== 'undefined' && Boolean(window.dinbilverkstad)

const bridge = window.dinbilverkstad ?? createMockApi()

export class ApiError extends Error {}

async function unwrap<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const result = await request
  if (!result.ok) throw new ApiError(result.error)
  return result.data
}

export const api = {
  listProducts: (filters: ProductFilters = {}): Promise<Product[]> =>
    unwrap(bridge.products.list(filters)),
  getProduct: (id: number): Promise<Product | null> => unwrap(bridge.products.get(id)),
  createProduct: (draft: ProductDraft): Promise<Product> => unwrap(bridge.products.create(draft)),
  updateProduct: (id: number, draft: ProductDraft): Promise<Product> =>
    unwrap(bridge.products.update(id, draft)),
  deleteProduct: (id: number): Promise<boolean> => unwrap(bridge.products.remove(id)),
  adjustQuantity: (id: number, delta: number): Promise<Product> =>
    unwrap(bridge.products.adjust(id, delta)),
  getFacets: () => unwrap(bridge.products.facets()),
  getCategoryCounts: (): Promise<CategoryCount[]> => unwrap(bridge.products.categoryCounts()),

  listSales: (filters: SaleFilters = {}): Promise<Sale[]> => unwrap(bridge.sales.list(filters)),
  createSale: (draft: SaleDraft): Promise<Sale> => unwrap(bridge.sales.create(draft)),
  deleteSale: (id: number): Promise<boolean> => unwrap(bridge.sales.remove(id)),

  getDashboardStats: (): Promise<DashboardStats> => unwrap(bridge.dashboard.stats()),

  getSettings: (): Promise<AppSettings> => unwrap(bridge.settings.get()),
  saveSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    unwrap(bridge.settings.save(patch)),
  pickLogo: (): Promise<string | null> => unwrap(bridge.settings.pickLogo()),
  pickBackupFolder: (): Promise<string | null> => unwrap(bridge.settings.pickFolder()),

  createBackup: (): Promise<BackupResult> => unwrap(bridge.backup.create()),
  pickRestoreFile: (): Promise<RestorePreview> => unwrap(bridge.backup.pickRestore()),
  confirmRestore: (filePath: string): Promise<BackupResult> =>
    unwrap(bridge.backup.confirmRestore(filePath)),

  getAppInfo: (): Promise<AppInfo> => unwrap(bridge.app.info()),
  resetDemoData: (): Promise<boolean> => unwrap(bridge.app.resetDemoData()),
  clearDatabase: (): Promise<boolean> => unwrap(bridge.app.clearDatabase()),
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Ett oväntat fel inträffade.'
}
