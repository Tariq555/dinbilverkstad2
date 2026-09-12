/// <reference types="vite/client" />

import type { DesktopApi } from '../electron/preload'

declare global {
  interface Window {
    /** Finns endast när appen körs i Electron. Saknas i webbförhandsvisning. */
    dinbilverkstad?: DesktopApi
  }
}

export {}
