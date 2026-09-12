import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS } from '@shared/constants'
import type { AppSettings, PageId, Product, TireCategoryId } from '@/types'

export interface AppContextValue {
  settings: AppSettings
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>
  /** Ökas när data ändrats så att öppna vyer laddar om sig själva. */
  revision: number
  refresh: () => void
  page: PageId
  navigate: (page: PageId, options?: { category?: TireCategoryId }) => void
  /** Kategori som lagervyn ska öppnas med, satt via navigate(). */
  pendingCategory: TireCategoryId | null
  clearPendingCategory: () => void
  /** Öppnar säljdialogen med en förvald produkt, oavsett vilken vy man står i. */
  startSale: (product?: Product) => void
}

export const AppContext = createContext<AppContextValue>({
  settings: { ...DEFAULT_SETTINGS },
  saveSettings: async () => undefined,
  revision: 0,
  refresh: () => undefined,
  page: 'dashboard',
  navigate: () => undefined,
  pendingCategory: null,
  clearPendingCategory: () => undefined,
  startSale: () => undefined,
})

export const useApp = (): AppContextValue => useContext(AppContext)

/** Genvägen till valutaformatering med butikens valda valuta. */
export function useCurrency(): string {
  return useApp().settings.currency
}
