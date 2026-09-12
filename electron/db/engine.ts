import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

/**
 * SQLite-motor baserad på sql.js (officiella SQLite kompilerad till WebAssembly).
 * Körs uteslutande i Electrons huvudprocess — renderaren når den bara via IPC.
 *
 * Valet av WebAssembly istället för en native-modul gör att Windows-installeraren
 * kan byggas från macOS och att slutkunden aldrig behöver byggverktyg.
 */

export type SqlValue = string | number | Uint8Array | null
export type SqlParams = SqlValue[] | Record<string, SqlValue>

interface SqlJsStatement {
  bind(params?: SqlParams): boolean
  step(): boolean
  getAsObject(): Record<string, SqlValue>
  free(): boolean
}

interface SqlJsDatabase {
  run(sql: string, params?: SqlParams): void
  prepare(sql: string): SqlJsStatement
  exec(sql: string): { columns: string[]; values: SqlValue[][] }[]
  export(): Uint8Array
  close(): void
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase
}

type SqlJsFactory = (config: { wasmBinary: Uint8Array }) => Promise<SqlJsStatic>

/**
 * SQLite-motorn laddas vid körning från en känd sökväg istället för att bakas
 * in i buntningen — WebAssembly-filen måste ändå ligga bredvid som egen fil.
 */
const dynamicRequire = createRequire(__filename)

const ENGINE_FILES = { js: 'sql-wasm.js', wasm: 'sql-wasm.wasm' }

function resolveEngineFile(fileName: string): string {
  const candidates = [
    path.join(__dirname, fileName),
    path.join(process.cwd(), 'dist-electron', fileName),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', fileName),
  ]
  const found = candidates.find((candidate) => fs.existsSync(candidate))
  if (!found) {
    throw new Error(
      `Kunde inte hitta SQLite-motorn (${fileName}). Kör "npm install" och därefter "npm run dev".`
    )
  }
  return found
}

let enginePromise: Promise<SqlJsStatic> | null = null

async function loadEngine(): Promise<SqlJsStatic> {
  if (!enginePromise) {
    const factory = dynamicRequire(resolveEngineFile(ENGINE_FILES.js)) as SqlJsFactory
    const wasmBinary = fs.readFileSync(resolveEngineFile(ENGINE_FILES.wasm))
    enginePromise = factory({ wasmBinary })
  }
  return enginePromise
}

export class SqliteDatabase {
  private constructor(
    private db: SqlJsDatabase,
    private readonly filePath: string
  ) {}

  static async open(filePath: string): Promise<SqliteDatabase> {
    const SQL = await loadEngine()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const exists = fs.existsSync(filePath)
    const db = exists ? new SQL.Database(fs.readFileSync(filePath)) : new SQL.Database()
    db.run('PRAGMA foreign_keys = ON;')
    const instance = new SqliteDatabase(db, filePath)
    if (!exists) instance.persist()
    return instance
  }

  /** Läser bytes utan att öppna en full databas — används vid validering av backup. */
  static async readAsDatabase(bytes: Uint8Array): Promise<SqliteDatabase> {
    const SQL = await loadEngine()
    return new SqliteDatabase(new SQL.Database(bytes), '')
  }

  all<T>(sql: string, params: SqlParams = []): T[] {
    const statement = this.db.prepare(sql)
    try {
      statement.bind(params)
      const rows: T[] = []
      while (statement.step()) rows.push(statement.getAsObject() as T)
      return rows
    } finally {
      statement.free()
    }
  }

  one<T>(sql: string, params: SqlParams = []): T | null {
    return this.all<T>(sql, params)[0] ?? null
  }

  run(sql: string, params: SqlParams = []): void {
    this.db.run(sql, params)
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  lastInsertId(): number {
    const row = this.one<{ id: number }>('SELECT last_insert_rowid() AS id')
    return row?.id ?? 0
  }

  /** Kör flera skrivningar atomiskt och sparar till disk först när allt lyckats. */
  transaction<T>(work: () => T): T {
    this.db.run('BEGIN')
    try {
      const result = work()
      this.db.run('COMMIT')
      this.persist()
      return result
    } catch (error) {
      this.db.run('ROLLBACK')
      throw error
    }
  }

  export(): Uint8Array {
    return this.db.export()
  }

  /** Atomisk skrivning: temporär fil först, därefter rename. */
  persist(): void {
    if (!this.filePath) return
    const bytes = Buffer.from(this.db.export())
    const tempPath = `${this.filePath}.tmp`
    fs.writeFileSync(tempPath, bytes)
    fs.renameSync(tempPath, this.filePath)
  }

  close(): void {
    this.db.close()
  }

  get path(): string {
    return this.filePath
  }
}
