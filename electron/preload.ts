import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/constants'
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
} from '@shared/types'

/**
 * Säker brygga mellan huvudprocessen och React.
 *
 * Renderaren kör med contextIsolation och sandbox påslaget och har ingen
 * tillgång till Node.js, filsystemet eller databasen — bara till de här
 * uttryckligen exponerade funktionerna.
 */

const invoke = <T>(channel: string, ...args: unknown[]): Promise<ApiResult<T>> =>
  ipcRenderer.invoke(channel, ...args)

const api = {
  products: {
    list: (filters: ProductFilters = {}) => invoke<Product[]>(IPC.productsList, filters),
    get: (id: number) => invoke<Product | null>(IPC.productsGet, id),
    create: (draft: ProductDraft) => invoke<Product>(IPC.productsCreate, draft),
    update: (id: number, draft: ProductDraft) => invoke<Product>(IPC.productsUpdate, id, draft),
    remove: (id: number) => invoke<boolean>(IPC.productsDelete, id),
    adjust: (id: number, delta: number) => invoke<Product>(IPC.productsAdjust, id, delta),
    facets: () => invoke<{ brands: string[]; sizes: string[]; locations: string[] }>(IPC.productsFacets),
    categoryCounts: () => invoke<CategoryCount[]>(IPC.productsCategoryCounts),
  },
  sales: {
    list: (filters: SaleFilters = {}) => invoke<Sale[]>(IPC.salesList, filters),
    create: (draft: SaleDraft) => invoke<Sale>(IPC.salesCreate, draft),
    remove: (id: number) => invoke<boolean>(IPC.salesDelete, id),
  },
  dashboard: {
    stats: () => invoke<DashboardStats>(IPC.dashboardStats),
  },
  settings: {
    get: () => invoke<AppSettings>(IPC.settingsGet),
    save: (patch: Partial<AppSettings>) => invoke<AppSettings>(IPC.settingsSave, patch),
    pickLogo: () => invoke<string | null>(IPC.settingsPickLogo),
    pickFolder: () => invoke<string | null>(IPC.settingsPickFolder),
  },
  backup: {
    create: () => invoke<BackupResult>(IPC.backupCreate),
    pickRestore: () => invoke<RestorePreview>(IPC.backupRestore),
    confirmRestore: (filePath: string) => invoke<BackupResult>(IPC.backupRestoreConfirm, filePath),
  },
  app: {
    info: () => invoke<AppInfo>(IPC.appInfo),
    resetDemoData: () => invoke<boolean>(IPC.demoReset),
    clearDatabase: () => invoke<boolean>(IPC.databaseClear),
  },
} as const

export type DesktopApi = typeof api

contextBridge.exposeInMainWorld('dinbilverkstad', api)
