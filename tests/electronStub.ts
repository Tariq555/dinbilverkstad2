import os from 'node:os'
import path from 'node:path'

/**
 * Stubbar Electrons API i testerna så att huvudprocessens kod kan köras
 * utan ett riktigt Electron-fönster.
 *
 * Varje testarbetare får en egen katalog — annars skulle testfiler som körs
 * parallellt skriva till samma databasfil och störa varandra.
 */
const WORKER_ID = process.env.VITEST_WORKER_ID ?? process.env.VITEST_POOL_ID ?? '0'
export const TEST_USER_DATA = path.join(os.tmpdir(), 'dinbilverkstad-tests', `worker-${WORKER_ID}`)

export const app = {
  getPath: () => TEST_USER_DATA,
  getVersion: () => '1.0.0',
  isPackaged: false,
  setName: () => undefined,
  setAppUserModelId: () => undefined,
  on: () => undefined,
  whenReady: () => Promise.resolve(),
  requestSingleInstanceLock: () => true,
  quit: () => undefined,
}

interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

// Returtyperna anges uttryckligen så att testerna kan ersätta svaren med vi.spyOn.
export const dialog = {
  showSaveDialog: async (): Promise<SaveDialogResult> => ({ canceled: true }),
  showOpenDialog: async (): Promise<OpenDialogResult> => ({ canceled: true, filePaths: [] }),
  showMessageBox: async (): Promise<{ response: number }> => ({ response: 0 }),
  showErrorBox: (): void => undefined,
}

export const ipcMain = { handle: () => undefined }
export const BrowserWindow = { fromWebContents: () => null, getAllWindows: () => [] }
export const shell = { openExternal: async () => undefined }
export const Menu = { setApplicationMenu: () => undefined, buildFromTemplate: () => ({}) }
