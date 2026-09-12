import { useApp } from '@/hooks/appContext'
import workshopLogo from '@/assets/dinbilverkstad-logo.png'

/**
 * Verkstadens egen banner högst upp i appen.
 *
 * Logotypen visas i sin ursprungliga form och proportion — den skalas bara,
 * beskärs inte och får ingen ram runt sig. Har verkstaden laddat upp en egen
 * logotyp under Inställningar används den i stället.
 */
export function WorkshopHeader() {
  const { settings } = useApp()

  return (
    <div className="workshop-cover">
      <img
        className="workshop-cover-logo"
        src={settings.shopLogo || workshopLogo}
        alt={settings.shopName || 'Din Bilverkstad'}
      />
    </div>
  )
}
