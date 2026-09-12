import fs from 'node:fs'
import path from 'node:path'
import { app, dialog, BrowserWindow } from 'electron'
import type { BackupResult, RestorePreview } from '@shared/types'
import { SqliteDatabase } from '../db/engine'
import { getDatabase, getDatabasePath, reopenDatabase, writeSafetyBackup, closeDatabase } from '../db'
import { getSettings } from '../repositories/settingsRepository'

const BACKUP_EXTENSION = 'db'

const showSave = (window: BrowserWindow | null, options: Electron.SaveDialogOptions) =>
  window ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options)

const showOpen = (window: BrowserWindow | null, options: Electron.OpenDialogOptions) =>
  window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)

function timestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`
}

function defaultBackupPath(): string {
  const settings = getSettings()
  const folder = settings.backupFolder || app.getPath('documents')
  return path.join(folder, `dinbilverkstad-backup-${timestamp()}.${BACKUP_EXTENSION}`)
}

/**
 * Exporterar databasen till en plats användaren väljer.
 * Systemdialogen frågar alltid innan en befintlig fil skrivs över.
 */
export async function createBackup(window: BrowserWindow | null): Promise<BackupResult> {
  const result = await showSave(window, {
    title: 'Skapa backup',
    defaultPath: defaultBackupPath(),
    buttonLabel: 'Spara backup',
    filters: [{ name: 'Databasfil', extensions: [BACKUP_EXTENSION] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  })

  if (result.canceled || !result.filePath) return { status: 'cancelled' }

  try {
    const database = getDatabase()
    database.persist()
    fs.writeFileSync(result.filePath, Buffer.from(database.export()))
    return { status: 'ok', path: result.filePath }
  } catch (error) {
    return { status: 'error', message: (error as Error).message }
  }
}

/** Automatisk backup vid avslut, om användaren aktiverat det i inställningarna. */
export function createAutomaticBackup(): string | null {
  const settings = getSettings()
  if (!settings.autoBackupOnExit || !settings.backupFolder) return null

  try {
    fs.mkdirSync(settings.backupFolder, { recursive: true })
    const target = path.join(settings.backupFolder, `auto-backup-${timestamp()}.${BACKUP_EXTENSION}`)
    fs.copyFileSync(getDatabasePath(), target)
    return target
  } catch {
    return null
  }
}

/**
 * Steg 1 av återställning: användaren väljer fil, vi validerar den och
 * rapporterar vad den innehåller. Ingenting skrivs över i det här steget.
 */
export async function pickAndValidateBackup(window: BrowserWindow | null): Promise<RestorePreview> {
  const result = await showOpen(window, {
    title: 'Välj backupfil att återställa',
    buttonLabel: 'Granska backup',
    filters: [{ name: 'Databasfil', extensions: [BACKUP_EXTENSION, 'sqlite', 'sqlite3'] }],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) return { status: 'cancelled' }

  const filePath = result.filePaths[0]
  try {
    const bytes = fs.readFileSync(filePath)
    const candidate = await SqliteDatabase.readAsDatabase(bytes)
    try {
      const tables = candidate
        .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
        .map((row) => row.name)

      if (!tables.includes('products') || !tables.includes('sales')) {
        return {
          status: 'invalid',
          path: filePath,
          message: 'Filen är inte en giltig backup från Din Bilverkstad.',
        }
      }

      const products = candidate.one<{ count: number }>('SELECT COUNT(*) AS count FROM products')
      const sales = candidate.one<{ count: number }>('SELECT COUNT(*) AS count FROM sales')

      return {
        status: 'ok',
        path: filePath,
        products: products?.count ?? 0,
        sales: sales?.count ?? 0,
      }
    } finally {
      candidate.close()
    }
  } catch (error) {
    return { status: 'invalid', path: filePath, message: (error as Error).message }
  }
}

/**
 * Steg 2: den faktiska återställningen. Anropas först efter att användaren
 * uttryckligen bekräftat. En säkerhetskopia av nuvarande databas sparas alltid.
 */
export async function confirmRestore(filePath: string): Promise<BackupResult> {
  if (!fs.existsSync(filePath)) {
    return { status: 'error', message: 'Backupfilen finns inte längre.' }
  }

  try {
    const safetyCopy = writeSafetyBackup()
    const bytes = fs.readFileSync(filePath)

    closeDatabase()
    const target = getDatabasePath()
    const tempPath = `${target}.restore`
    fs.writeFileSync(tempPath, bytes)
    fs.renameSync(tempPath, target)
    await reopenDatabase()

    return { status: 'ok', path: safetyCopy }
  } catch (error) {
    await reopenDatabase()
    return { status: 'error', message: (error as Error).message }
  }
}
