import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS } from '@shared/constants'
import { Sidebar } from '@/components/layout/Sidebar'
import { WorkshopHeader } from '@/components/layout/WorkshopHeader'
import { SellDialog } from '@/features/sales/SellDialog'
import { DashboardPage } from '@/pages/DashboardPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { TiresPage } from '@/pages/TiresPage'
import { SalesPage } from '@/pages/SalesPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AppContext, type AppContextValue } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import { api, errorMessage } from '@/services/api'
import type { AppSettings, PageId, Product, TireCategoryId } from '@/types'

const PAGES: Record<PageId, () => JSX.Element> = {
  dashboard: DashboardPage,
  lager: InventoryPage,
  dack: TiresPage,
  forsaljning: SalesPage,
  historik: HistoryPage,
  installningar: SettingsPage,
}

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard',
  lager: 'Lager',
  dack: 'Lägg till däck',
  forsaljning: 'Försäljning',
  historik: 'Historik',
  installningar: 'Inställningar',
}

export function App() {
  const toast = useToast()

  const [page, setPage] = useState<PageId>('dashboard')
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS })
  const [revision, setRevision] = useState(0)
  const [sellTarget, setSellTarget] = useState<Product | null>(null)
  const [sellOpen, setSellOpen] = useState(false)
  const [counters, setCounters] = useState({ products: 0, lowStock: 0 })
  const [pendingCategory, setPendingCategory] = useState<TireCategoryId | null>(null)

  const refresh = useCallback(() => setRevision((current) => current + 1), [])

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((error) => toast.error('Kunde inte läsa inställningar', errorMessage(error)))
  }, [toast])

  useEffect(() => {
    api
      .getDashboardStats()
      .then((stats) =>
        setCounters({
          products: stats.inventory.totalProducts,
          lowStock: stats.inventory.lowStockCount + stats.inventory.outOfStockCount,
        })
      )
      .catch(() => undefined)
  }, [revision])

  useEffect(() => {
    document.title = `${PAGE_TITLES[page]} · ${settings.shopName || 'Din Bilverkstad'}`
  }, [page, settings.shopName])

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const updated = await api.saveSettings(patch)
      setSettings(updated)
    },
    []
  )

  const startSale = useCallback((product?: Product) => {
    setSellTarget(product ?? null)
    setSellOpen(true)
  }, [])

  /** Globala genvägar: Ctrl+N nytt däck, Ctrl+S sälj, Ctrl+F sök i lagret. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        setPage('dack')
      } else if (key === 's') {
        event.preventDefault()
        startSale()
      } else if (key === 'f') {
        event.preventDefault()
        setPage('lager')
        window.setTimeout(() => {
          document.querySelector<HTMLInputElement>('.filter-bar .search input')?.focus()
        }, 60)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [startSale])

  const navigate = useCallback((next: PageId, options?: { category?: TireCategoryId }) => {
    if (options?.category) setPendingCategory(options.category)
    setPage(next)
  }, [])

  const clearPendingCategory = useCallback(() => setPendingCategory(null), [])

  const context = useMemo<AppContextValue>(
    () => ({
      settings,
      saveSettings,
      revision,
      refresh,
      page,
      navigate,
      pendingCategory,
      clearPendingCategory,
      startSale,
    }),
    [settings, saveSettings, revision, refresh, page, navigate, pendingCategory, clearPendingCategory, startSale]
  )

  const CurrentPage = PAGES[page]

  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <Sidebar lowStockCount={counters.lowStock} productCount={counters.products} />
        <main className="main">
          <WorkshopHeader />
          <CurrentPage />
        </main>
      </div>

      <SellDialog
        open={sellOpen}
        product={sellTarget}
        onClose={() => setSellOpen(false)}
        onSold={refresh}
      />
    </AppContext.Provider>
  )
}
