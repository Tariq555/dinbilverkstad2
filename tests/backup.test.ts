import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { dialog } from './electronStub'
import { getDatabase, getDatabasePath, getSafetyBackupDirectory, initDatabase, writeSafetyBackup } from '../electron/db'
import { confirmRestore, createBackup, pickAndValidateBackup } from '../electron/services/backupService'
import { createProduct, listProducts } from '../electron/repositories/productRepository'
import type { ProductDraft } from '@shared/types'

const workDir = path.join(os.tmpdir(), 'dinbilverkstad-backup-tests')

const draft = (brand: string): ProductDraft => ({
  brand,
  model: 'Modell',
  size: '205/55R16',
  width: null,
  profile: null,
  rim: null,
  season: 'vinter',
  tireType: 'dubbdack',
  studded: true,
  condition: 'ny',
  quantity: 4,
  purchasePrice: 1000,
  sellingPrice: 1500,
  location: 'Lager A',
  notes: '',
  lowStockThreshold: 4,
})

beforeAll(async () => {
  await initDatabase()
})

beforeEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true })
  fs.mkdirSync(workDir, { recursive: true })
  const db = getDatabase()
  db.transaction(() => {
    db.run('DELETE FROM sales')
    db.run('DELETE FROM products')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('skapa backup', () => {
  test('exporterar databasen till vald sökväg', async () => {
    createProduct(draft('Nokian'))
    const target = path.join(workDir, 'backup.db')
    vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({ canceled: false, filePath: target })

    const result = await createBackup(null)

    expect(result.status).toBe('ok')
    expect(result.path).toBe(target)
    expect(fs.existsSync(target)).toBe(true)
    // SQLite-filer inleds alltid med "SQLite format 3".
    expect(fs.readFileSync(target).subarray(0, 15).toString()).toBe('SQLite format 3')
  })

  test('avbryter utan att skriva någon fil', async () => {
    vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({ canceled: true, filePath: undefined })

    const result = await createBackup(null)

    expect(result.status).toBe('cancelled')
    expect(fs.readdirSync(workDir)).toHaveLength(0)
  })
})

describe('granska backup före återställning', () => {
  test('rapporterar innehållet i en giltig backup', async () => {
    createProduct(draft('Michelin'))
    createProduct(draft('Continental'))
    const target = path.join(workDir, 'giltig.db')
    vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({ canceled: false, filePath: target })
    await createBackup(null)

    vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({ canceled: false, filePaths: [target] })
    const preview = await pickAndValidateBackup(null)

    expect(preview.status).toBe('ok')
    expect(preview.products).toBe(2)
    expect(preview.sales).toBe(0)
  })

  test('avvisar en fil som inte är en databas', async () => {
    const target = path.join(workDir, 'skrap.db')
    fs.writeFileSync(target, 'det här är inte en databas')
    vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({ canceled: false, filePaths: [target] })

    const preview = await pickAndValidateBackup(null)

    expect(preview.status).toBe('invalid')
  })

  test('avvisar en databas utan rätt tabeller', async () => {
    const target = path.join(workDir, 'annan.db')
    // En giltig men artfrämmande SQLite-fil ska inte gå att återställa.
    const other = await (await import('../electron/db/engine')).SqliteDatabase.open(target)
    other.exec('CREATE TABLE kunder (id INTEGER PRIMARY KEY)')
    other.persist()
    other.close()

    vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({ canceled: false, filePaths: [target] })
    const preview = await pickAndValidateBackup(null)

    expect(preview.status).toBe('invalid')
    expect(preview.message).toMatch(/giltig backup/)
  })

  test('avbryter utan att röra databasen', async () => {
    vi.spyOn(dialog, 'showOpenDialog').mockResolvedValue({ canceled: true, filePaths: [] })

    expect((await pickAndValidateBackup(null)).status).toBe('cancelled')
  })
})

describe('återställa backup', () => {
  test('ersätter innehållet och sparar en säkerhetskopia först', async () => {
    createProduct(draft('FöreBackup'))
    const target = path.join(workDir, 'aterstall.db')
    vi.spyOn(dialog, 'showSaveDialog').mockResolvedValue({ canceled: false, filePath: target })
    await createBackup(null)

    // Ändra databasen efter att backupen togs.
    createProduct(draft('EfterBackup'))
    expect(listProducts()).toHaveLength(2)

    const result = await confirmRestore(target)

    expect(result.status).toBe('ok')
    expect(listProducts()).toHaveLength(1)
    expect(listProducts()[0].brand).toBe('FöreBackup')
    // Säkerhetskopian av den överskrivna databasen ska finnas kvar.
    expect(fs.existsSync(result.path!)).toBe(true)
  })

  test('ger fel om backupfilen försvunnit', async () => {
    const result = await confirmRestore(path.join(workDir, 'finns-inte.db'))

    expect(result.status).toBe('error')
    expect(result.message).toMatch(/finns inte/)
  })
})

describe('säkerhetskopior', () => {
  test('kopierar nuvarande databas och behåller högst tio', () => {
    createProduct(draft('Nokian'))
    fs.rmSync(getSafetyBackupDirectory(), { recursive: true, force: true })

    for (let i = 0; i < 12; i++) {
      const copy = writeSafetyBackup()
      expect(fs.existsSync(copy)).toBe(true)
      // Filnamnen har sekundupplösning — gör dem unika i testet.
      fs.renameSync(copy, path.join(getSafetyBackupDirectory(), `fore-aterstallning-${i}.db`))
    }

    writeSafetyBackup()
    const kept = fs.readdirSync(getSafetyBackupDirectory()).filter((n) => n.endsWith('.db'))

    expect(kept.length).toBeLessThanOrEqual(10)
  })

  test('databasfilen ligger kvar på sin plats efter kopiering', () => {
    writeSafetyBackup()

    expect(fs.existsSync(getDatabasePath())).toBe(true)
  })
})
