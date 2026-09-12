import path from 'node:path'
import { app, BrowserWindow, shell, Menu, dialog } from 'electron'
import { initDatabase, closeDatabase } from './db'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { createAutomaticBackup } from './services/backupService'

const APP_NAME = 'Din Bilverkstad'
const WINDOW = { width: 1480, height: 940, minWidth: 1120, minHeight: 720 }
const BACKGROUND = '#0B0D10'

app.setName(APP_NAME)
if (process.platform === 'win32') app.setAppUserModelId('se.dinbilverkstad.dacklager')

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(__dirname, '..', 'dist')

let mainWindow: BrowserWindow | null = null

/** Bara en instans åt gången — annars kan två fönster skriva till samma databasfil. */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    ...WINDOW,
    title: APP_NAME,
    backgroundColor: BACKGROUND,
    show: false,
    autoHideMenuBar: process.platform === 'win32',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Externa länkar öppnas i systemets webbläsare, aldrig i appfönstret.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{ role: 'appMenu' as const, label: APP_NAME }]
      : []),
    {
      label: 'Arkiv',
      submenu: [process.platform === 'darwin' ? { role: 'close', label: 'Stäng' } : { role: 'quit', label: 'Avsluta' }],
    },
    {
      label: 'Redigera',
      submenu: [
        { role: 'undo', label: 'Ångra' },
        { role: 'redo', label: 'Gör om' },
        { type: 'separator' },
        { role: 'cut', label: 'Klipp ut' },
        { role: 'copy', label: 'Kopiera' },
        { role: 'paste', label: 'Klistra in' },
        { role: 'selectAll', label: 'Markera allt' },
      ],
    },
    {
      label: 'Visa',
      submenu: [
        { role: 'reload', label: 'Ladda om' },
        { role: 'toggleDevTools', label: 'Utvecklarverktyg' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Normal storlek' },
        { role: 'zoomIn', label: 'Zooma in' },
        { role: 'zoomOut', label: 'Zooma ut' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Helskärm' },
      ],
    },
    {
      label: 'Hjälp',
      submenu: [
        {
          label: `Om ${APP_NAME}`,
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: `Om ${APP_NAME}`,
              message: `${APP_NAME} — Däcklager`,
              detail: `Version ${app.getVersion()}\n\nAll data lagras lokalt på den här datorn.\nProgrammet fungerar helt utan internetanslutning.`,
              buttons: ['Stäng'],
            })
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  try {
    await initDatabase()
  } catch (error) {
    dialog.showErrorBox(
      'Databasen kunde inte startas',
      `${(error as Error).message}\n\nProgrammet avslutas.`
    )
    app.quit()
    return
  }

  registerIpcHandlers()
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  createAutomaticBackup()
  closeDatabase()
})
