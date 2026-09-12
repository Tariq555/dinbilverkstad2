import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { SqliteDatabase } from './engine'
import { runMigrations } from './migrations'

/**
 * Databasens livscykel.
 *
 * Filen lagras i Electrons användardatakatalog (på Windows:
 * %APPDATA%\Din Bilverkstad\data\dinbilverkstad.db) — aldrig i installations-
 * mappen. Därmed överlever databasen både uppdateringar och ominstallation.
 */

const DB_DIRECTORY = 'data'
const DB_FILE = 'dinbilverkstad.db'
const SAFETY_DIRECTORY = 'safety-backups'

let database: SqliteDatabase | null = null

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), DB_DIRECTORY, DB_FILE)
}

export function getSafetyBackupDirectory(): string {
  return path.join(app.getPath('userData'), SAFETY_DIRECTORY)
}

/**
 * Öppnar databasen och kör migreringarna.
 *
 * Ingen demodata läggs in här — en nyinstallerad app startar med tomt lager
 * så att verkstaden kan börja registrera sina egna däck direkt. Demodata kan
 * fortfarande laddas manuellt under utveckling (se Inställningar → Databas).
 */
export async function initDatabase(): Promise<SqliteDatabase> {
  const filePath = getDatabasePath()
  database = await SqliteDatabase.open(filePath)
  runMigrations(database)
  return database
}

export function getDatabase(): SqliteDatabase {
  if (!database) throw new Error('Databasen är inte initierad ännu.')
  return database
}

/** Stänger och öppnar om databasen — används efter en återställd backup. */
export async function reopenDatabase(): Promise<SqliteDatabase> {
  database?.close()
  database = null
  return initDatabase()
}

/**
 * Skriver en säkerhetskopia av nuvarande databas innan en destruktiv åtgärd.
 * Returnerar sökvägen så att användaren kan informeras om var den ligger.
 */
export function writeSafetyBackup(): string {
  const source = getDatabasePath()
  if (!fs.existsSync(source)) return ''
  const directory = getSafetyBackupDirectory()
  fs.mkdirSync(directory, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const target = path.join(directory, `fore-aterstallning-${stamp}.db`)
  fs.copyFileSync(source, target)
  pruneSafetyBackups(directory)
  return target
}

const MAX_SAFETY_BACKUPS = 10

function pruneSafetyBackups(directory: string): void {
  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.db'))
    .map((name) => ({ name, time: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time)

  files.slice(MAX_SAFETY_BACKUPS).forEach((file) => {
    fs.unlinkSync(path.join(directory, file.name))
  })
}

export function closeDatabase(): void {
  database?.close()
  database = null
}
