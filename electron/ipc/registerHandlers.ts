import fs from 'node:fs'
import path from 'node:path'
import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import type {
  ApiResult,
  AppInfo,
  AppSettings,
  ProductDraft,
  ProductFilters,
  SaleDraft,
  SaleFilters,
} from '@shared/types'
import { IPC } from '@shared/constants'
import { getDatabasePath, reopenDatabase, getDatabase } from '../db'
import { seedDemoData } from '../db/seed'
import {
  adjustQuantity,
  createProduct,
  deleteProduct,
  getCategoryCounts,
  getFacets,
  getProduct,
  listProducts,
  updateProduct,
} from '../repositories/productRepository'
import { createSale, deleteSale, listSales } from '../repositories/salesRepository'
import { getDashboardStats } from '../repositories/statsRepository'
import { getSettings, saveSettings } from '../repositories/settingsRepository'
import {
  confirmRestore,
  createBackup,
  pickAndValidateBackup,
} from '../services/backupService'

/**
 * Varje handler returnerar ett ApiResult istället för att kasta vidare fel över
 * IPC-bryggan. Renderaren får alltid ett förutsägbart svar och kan visa ett
 * begripligt felmeddelande på svenska.
 */
function handle<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (window: BrowserWindow | null, ...args: TArgs) => TResult | Promise<TResult>
): void {
  ipcMain.handle(channel, async (event, ...args): Promise<ApiResult<TResult>> => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const data = await handler(window, ...(args as TArgs))
      return { ok: true, data }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ett okänt fel inträffade.'
      console.error(`[ipc] ${channel} misslyckades:`, error)
      return { ok: false, error: message }
    }
  })
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const LOGO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export function registerIpcHandlers(): void {
  handle(IPC.productsList, (_w, filters: ProductFilters) => listProducts(filters))
  handle(IPC.productsGet, (_w, id: number) => getProduct(id))
  handle(IPC.productsCreate, (_w, draft: ProductDraft) => createProduct(draft))
  handle(IPC.productsUpdate, (_w, id: number, draft: ProductDraft) => updateProduct(id, draft))
  handle(IPC.productsDelete, (_w, id: number) => {
    deleteProduct(id)
    return true
  })
  handle(IPC.productsAdjust, (_w, id: number, delta: number) => adjustQuantity(id, delta))
  handle(IPC.productsFacets, () => getFacets())
  handle(IPC.productsCategoryCounts, () => getCategoryCounts())

  handle(IPC.salesList, (_w, filters: SaleFilters) => listSales(filters))
  handle(IPC.salesCreate, (_w, draft: SaleDraft) => createSale(draft))
  handle(IPC.salesDelete, (_w, id: number) => {
    deleteSale(id)
    return true
  })

  handle(IPC.dashboardStats, () => getDashboardStats())

  handle(IPC.settingsGet, () => getSettings())
  handle(IPC.settingsSave, (_w, patch: Partial<AppSettings>) => saveSettings(patch))

  handle(IPC.settingsPickLogo, async (window) => {
    const result = window
      ? await dialog.showOpenDialog(window, logoDialogOptions())
      : await dialog.showOpenDialog(logoDialogOptions())
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const stats = fs.statSync(filePath)
    if (stats.size > MAX_LOGO_BYTES) {
      throw new Error('Logotypen är för stor. Välj en bild under 2 MB.')
    }

    const extension = path.extname(filePath).toLowerCase()
    const mime = LOGO_MIME[extension]
    if (!mime) throw new Error('Filformatet stöds inte. Använd PNG, JPG, SVG eller WEBP.')

    const dataUrl = `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
    saveSettings({ shopLogo: dataUrl })
    return dataUrl
  })

  handle(IPC.settingsPickFolder, async (window) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Välj mapp för backup',
      buttonLabel: 'Använd mappen',
      properties: ['openDirectory', 'createDirectory'],
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    saveSettings({ backupFolder: result.filePaths[0] })
    return result.filePaths[0]
  })

  handle(IPC.backupCreate, (window) => createBackup(window))
  handle(IPC.backupRestore, (window) => pickAndValidateBackup(window))
  handle(IPC.backupRestoreConfirm, (_w, filePath: string) => confirmRestore(filePath))

  handle(IPC.appInfo, (): AppInfo => ({
    version: app.getVersion(),
    databasePath: getDatabasePath(),
    userDataPath: app.getPath('userData'),
    platform: process.platform,
    isPackaged: app.isPackaged,
  }))

  /** Nollställer databasen och lägger tillbaka demodata (bekräftas i gränssnittet). */
  handle(IPC.demoReset, async () => {
    emptyProductAndSalesTables()
    seedDemoData(getDatabase())
    await reopenDatabase()
    return true
  })

  /** Tömmer lager och historik helt — används när butiken går skarpt. */
  handle(IPC.databaseClear, async () => {
    emptyProductAndSalesTables()
    await reopenDatabase()
    return true
  })
}

/** Rensar lager och försäljningar men behåller inställningarna. */
function emptyProductAndSalesTables(): void {
  const db = getDatabase()
  db.transaction(() => {
    db.run('DELETE FROM sales')
    db.run('DELETE FROM products')
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'sales')")
  })
}

function logoDialogOptions(): Electron.OpenDialogOptions {
  return {
    title: 'Välj logotyp',
    buttonLabel: 'Använd logotyp',
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
    properties: ['openFile'],
  }
}
