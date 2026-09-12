import type { PageId } from '@/types'
import { useApp } from '@/hooks/appContext'
import workshopLogo from '@/assets/dinbilverkstad-logo.png'
import {
  IconDashboard,
  IconHistory,
  IconInventory,
  IconOffline,
  IconSale,
  IconSettings,
  IconTire,
} from '@/components/ui/Icons'

interface NavEntry {
  id: PageId
  label: string
  icon: JSX.Element
  section?: string
}

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={18} />, section: 'Översikt' },
  { id: 'lager', label: 'Lager', icon: <IconInventory size={18} /> },
  { id: 'dack', label: 'Däck', icon: <IconTire size={18} /> },
  { id: 'forsaljning', label: 'Försäljning', icon: <IconSale size={18} />, section: 'Butik' },
  { id: 'historik', label: 'Historik', icon: <IconHistory size={18} /> },
  { id: 'installningar', label: 'Inställningar', icon: <IconSettings size={18} />, section: 'System' },
]

interface SidebarProps {
  lowStockCount: number
  productCount: number
}

export function Sidebar({ lowStockCount, productCount }: SidebarProps) {
  const { page, navigate, settings } = useApp()

  const countFor = (id: PageId): { value: number; alert?: boolean } | null => {
    if (id === 'lager') return { value: productCount }
    if (id === 'dashboard' && lowStockCount > 0) return { value: lowStockCount, alert: true }
    return null
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          className="sidebar-brand-logo"
          src={settings.shopLogo || workshopLogo}
          alt={settings.shopName || 'Din Bilverkstad'}
        />
        <div className="sidebar-brand-sub sidebar-brand-text">Däcklager</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((entry) => {
          const count = countFor(entry.id)
          return (
            <div key={entry.id}>
              {entry.section && <div className="sidebar-section">{entry.section}</div>}
              <button
                type="button"
                className={`nav-item ${page === entry.id ? 'active' : ''}`}
                onClick={() => navigate(entry.id)}
                aria-current={page === entry.id ? 'page' : undefined}
              >
                {entry.icon}
                <span className="nav-label">{entry.label}</span>
                {count && <span className={`nav-count ${count.alert ? 'alert' : ''}`}>{count.value}</span>}
              </button>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <span className="offline-pill">
          <IconOffline size={13} />
          Offline · lokal databas
        </span>
      </div>
    </aside>
  )
}
