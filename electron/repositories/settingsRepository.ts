import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/constants'
import { getDatabase } from '../db'

/** Inställningar lagras som nyckel/värde och slås alltid ihop med standardvärden. */
export function getSettings(): AppSettings {
  const rows = getDatabase().all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]))

  return {
    shopName: stored.shopName ?? DEFAULT_SETTINGS.shopName,
    shopLogo: stored.shopLogo ?? DEFAULT_SETTINGS.shopLogo,
    currency: stored.currency ?? DEFAULT_SETTINGS.currency,
    defaultPurchasePrice: toNumber(stored.defaultPurchasePrice, DEFAULT_SETTINGS.defaultPurchasePrice),
    defaultSellingPrice: toNumber(stored.defaultSellingPrice, DEFAULT_SETTINGS.defaultSellingPrice),
    defaultLocation: stored.defaultLocation ?? DEFAULT_SETTINGS.defaultLocation,
    defaultQuantity: toNumber(stored.defaultQuantity, DEFAULT_SETTINGS.defaultQuantity),
    lowStockThreshold: toNumber(stored.lowStockThreshold, DEFAULT_SETTINGS.lowStockThreshold),
    backupFolder: stored.backupFolder ?? DEFAULT_SETTINGS.backupFolder,
    autoBackupOnExit: stored.autoBackupOnExit === 'true',
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const db = getDatabase()
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined)

  db.transaction(() => {
    for (const [key, value] of entries) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [
        key,
        String(value),
        String(value),
      ])
    }
  })

  return getSettings()
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== undefined ? parsed : fallback
}
