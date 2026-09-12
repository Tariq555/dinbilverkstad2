import type { Condition, Season, TireCategory, TireCategoryId } from './types'

export const SEASONS: { value: Season; label: string }[] = [
  { value: 'sommar', label: 'Sommar' },
  { value: 'vinter', label: 'Vinter' },
  { value: 'helar', label: 'Helår' },
]

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'ny', label: 'Ny' },
  { value: 'begagnad', label: 'Begagnad' },
]

/**
 * Däckkategorier för en vanlig bilverkstad (personbil).
 *
 * Dubbdäck och friktionsdäck är båda vinterdäck — de ligger därför under
 * säsongen vinter. M+S är en märkning och inte en egen säsong; den används
 * på däck som får köras året om.
 *
 * Personalen väljer en enda kategori när ett däck läggs in. Säsong och
 * dubbning sätts automatiskt utifrån valet, så ingen kan råka spara ett
 * dubbdäck som sommardäck.
 */
export const TIRE_CATEGORIES: TireCategory[] = [
  {
    id: 'sommardack',
    label: 'Sommardäck',
    short: 'Sommar',
    season: 'sommar',
    studded: false,
    description: 'För sommarhalvåret',
  },
  {
    id: 'vinterdack',
    label: 'Vinterdäck',
    short: 'Vinter',
    season: 'vinter',
    studded: false,
    description: 'Vinterdäck utan angiven typ',
  },
  {
    id: 'dubbdack',
    label: 'Dubbdäck',
    short: 'Dubb',
    season: 'vinter',
    studded: true,
    description: 'Vinterdäck med dubb',
  },
  {
    id: 'friktionsdack',
    label: 'Friktionsdäck',
    short: 'Friktion',
    season: 'vinter',
    studded: false,
    description: 'Vinterdäck utan dubb',
  },
  {
    id: 'ms-dack',
    label: 'M+S-däck',
    short: 'M+S',
    season: 'helar',
    studded: false,
    description: 'M+S-märkta däck',
  },
]

export const DEFAULT_TIRE_CATEGORY: TireCategoryId = 'vinterdack'

export const tireCategory = (id: string): TireCategory | undefined =>
  TIRE_CATEGORIES.find((category) => category.id === id)

export const DEFAULT_SETTINGS = {
  shopName: 'Din Bilverkstad',
  shopLogo: '',
  currency: 'SEK',
  defaultPurchasePrice: 0,
  defaultSellingPrice: 0,
  defaultLocation: 'Lager A',
  defaultQuantity: 4,
  lowStockThreshold: 4,
  backupFolder: '',
  autoBackupOnExit: false,
} as const

export const IPC = {
  productsList: 'products:list',
  productsGet: 'products:get',
  productsCreate: 'products:create',
  productsUpdate: 'products:update',
  productsDelete: 'products:delete',
  productsAdjust: 'products:adjust',
  productsFacets: 'products:facets',
  productsCategoryCounts: 'products:categoryCounts',
  salesList: 'sales:list',
  salesCreate: 'sales:create',
  salesDelete: 'sales:delete',
  dashboardStats: 'dashboard:stats',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsPickLogo: 'settings:pickLogo',
  settingsPickFolder: 'settings:pickFolder',
  backupCreate: 'backup:create',
  backupRestore: 'backup:restore',
  backupRestoreConfirm: 'backup:restoreConfirm',
  appInfo: 'app:info',
  demoReset: 'demo:reset',
  databaseClear: 'database:clear',
} as const
