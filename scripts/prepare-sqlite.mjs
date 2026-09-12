/**
 * Kopierar SQLite-motorn (sql.js / WebAssembly) till dist-electron så att
 * Electrons huvudprocess kan ladda den både i utveckling och i den paketerade
 * Windows-appen. Inga native-moduler behövs — därför kan Windows-installeraren
 * byggas direkt från macOS.
 */
import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'sql.js', 'dist')
const target = join(root, 'dist-electron')
const FILES = ['sql-wasm.js', 'sql-wasm.wasm']

if (!existsSync(source)) {
  console.warn('[prepare-sqlite] sql.js hittades inte ännu — kör "npm install" först.')
  process.exit(0)
}

mkdirSync(target, { recursive: true })

for (const file of FILES) {
  const from = join(source, file)
  if (!existsSync(from)) {
    console.error(`[prepare-sqlite] Saknar ${from}`)
    process.exit(1)
  }
  copyFileSync(from, join(target, file))
}

console.log('[prepare-sqlite] SQLite-motorn kopierad till dist-electron/')
