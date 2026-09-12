import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import fs from 'node:fs'
import { TEST_USER_DATA } from './electronStub'
import { getDatabase, getDatabasePath, initDatabase } from '../electron/db'
import { runMigrations } from '../electron/db/migrations'
import { TIRE_CATEGORIES } from '@shared/constants'
import {
  adjustQuantity,
  createProduct,
  deleteProduct,
  getCategoryCounts,
  getFacets,
  getProduct,
  listProducts,
  updateProduct,
} from '../electron/repositories/productRepository'
import { createSale, deleteSale, listSales } from '../electron/repositories/salesRepository'
import { getDashboardStats, getInventorySummary } from '../electron/repositories/statsRepository'
import { getSettings, saveSettings } from '../electron/repositories/settingsRepository'
import type { ProductDraft } from '@shared/types'

const draft = (overrides: Partial<ProductDraft> = {}): ProductDraft => ({
  brand: 'Testmärke',
  model: 'Testmodell',
  size: '225/45R17',
  width: null,
  profile: null,
  rim: null,
  season: 'sommar',
  tireType: 'sommardack',
  studded: false,
  condition: 'ny',
  quantity: 10,
  purchasePrice: 1000,
  sellingPrice: 1500,
  location: 'Lager Z',
  notes: '',
  lowStockThreshold: 4,
  ...overrides,
})

/** Nollställer databasen mellan testerna så att varje test står för sig självt. */
function resetTables() {
  const db = getDatabase()
  db.transaction(() => {
    db.run('DELETE FROM sales')
    db.run('DELETE FROM products')
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'sales')")
    db.run('DELETE FROM settings')
  })
}

beforeAll(async () => {
  fs.rmSync(TEST_USER_DATA, { recursive: true, force: true })
  await initDatabase()
})

describe('databasen', () => {
  test('skapar databasfilen i användardatakatalogen', () => {
    expect(fs.existsSync(getDatabasePath())).toBe(true)
    expect(getDatabasePath()).toContain(TEST_USER_DATA)
  })

  test('startar helt tom — ingen demodata i den levererade appen', () => {
    expect(listProducts()).toHaveLength(0)
    expect(listSales({ limit: 5000 })).toHaveLength(0)
  })

  test('skapar schemat med produkter, försäljningar och inställningar', () => {
    const tables = getDatabase()
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .map((row) => row.name)

    expect(tables).toEqual(expect.arrayContaining(['products', 'sales', 'settings', 'schema_migrations']))
  })

  test('går att öppna om utan att data ändras', async () => {
    createProduct(draft())
    await initDatabase()

    expect(listProducts()).toHaveLength(1)
  })
})

describe('produkter', () => {
  beforeEach(resetTables)

  test('skapar produkt och genererar löpande artikelnummer', () => {
    const first = createProduct(draft())
    const second = createProduct(draft({ brand: 'Andra' }))

    expect(first.sku).toBe('DB-00001')
    expect(second.sku).toBe('DB-00002')
  })

  test('delar upp dimensionen i bredd, profil och fälg', () => {
    const product = createProduct(draft({ size: '205/55R16' }))

    expect(product.width).toBe(205)
    expect(product.profile).toBe(55)
    expect(product.rim).toBe(16)
  })

  test('kräver märke och dimension', () => {
    expect(() => createProduct(draft({ brand: '  ' }))).toThrow(/Märke/)
    expect(() => createProduct(draft({ size: '' }))).toThrow(/Dimension/)
  })

  test('tillåter inte negativt antal eller negativa priser', () => {
    expect(() => createProduct(draft({ quantity: -1 }))).toThrow(/negativt/)
    expect(() => createProduct(draft({ purchasePrice: -5 }))).toThrow(/Inköpspris/)
    expect(() => createProduct(draft({ sellingPrice: -5 }))).toThrow(/Försäljningspris/)
  })

  test('vägrar dubblerade artikelnummer', () => {
    createProduct(draft({ sku: 'DB-EGEN' }))
    expect(() => createProduct(draft({ sku: 'DB-EGEN' }))).toThrow(/används redan/)
  })

  test('uppdaterar en produkt och sätter ny ändringstidpunkt', () => {
    const product = createProduct(draft())
    const updated = updateProduct(product.id, draft({ sellingPrice: 1750, quantity: 8 }))

    expect(updated.sellingPrice).toBe(1750)
    expect(updated.quantity).toBe(8)
    expect(updated.createdAt).toBe(product.createdAt)
  })

  test('justerar lagersaldo men aldrig under noll', () => {
    const product = createProduct(draft({ quantity: 4 }))

    expect(adjustQuantity(product.id, 6).quantity).toBe(10)
    expect(() => adjustQuantity(product.id, -11)).toThrow(/negativt/)
  })

  test('tar bort produkten men behåller försäljningshistoriken', () => {
    const product = createProduct(draft())
    createSale({ productId: product.id, quantity: 2, unitPrice: 1500 })

    deleteProduct(product.id)

    expect(getProduct(product.id)).toBeNull()
    expect(listSales().length).toBe(1)
    expect(listSales()[0].productId).toBeNull()
  })
})

describe('filter och sortering', () => {
  beforeEach(() => {
    resetTables()
    createProduct(draft({ brand: 'Nokian', tireType: 'dubbdack', quantity: 20 }))
    createProduct(draft({ brand: 'Michelin', tireType: 'sommardack', quantity: 2, lowStockThreshold: 4 }))
    createProduct(draft({ brand: 'Continental', tireType: 'friktionsdack', quantity: 0 }))
  })

  test('filtrerar på säsong', () => {
    expect(listProducts({ season: 'vinter' })).toHaveLength(2)
  })

  test('vinterdäck som filter omfattar både dubb och friktion', () => {
    expect(listProducts({ category: 'vinterdack' })).toHaveLength(2)
  })

  test('filtrerar på enskild kategori', () => {
    expect(listProducts({ category: 'dubbdack' })).toHaveLength(1)
    expect(listProducts({ category: 'friktionsdack' })).toHaveLength(1)
    expect(listProducts({ category: 'sommardack' })).toHaveLength(1)
    expect(listProducts({ category: 'ms-dack' })).toHaveLength(0)
  })

  test('filtrerar på lagernivå', () => {
    expect(listProducts({ stockLevel: 'in-stock' })).toHaveLength(2)
    expect(listProducts({ stockLevel: 'low' })).toHaveLength(1)
    expect(listProducts({ stockLevel: 'out' })).toHaveLength(1)
  })

  test('söker fritext över märke och dimension', () => {
    expect(listProducts({ search: 'nokian' })).toHaveLength(1)
    expect(listProducts({ search: '225/45' })).toHaveLength(3)
    expect(listProducts({ search: 'finns-inte' })).toHaveLength(0)
  })

  test('sorterar stigande och fallande', () => {
    const stigande = listProducts({ sortBy: 'quantity', sortDir: 'asc' })
    const fallande = listProducts({ sortBy: 'quantity', sortDir: 'desc' })

    expect(stigande[0].quantity).toBe(0)
    expect(fallande[0].quantity).toBe(20)
  })

  test('samlar värden till filtermenyerna', () => {
    const facets = getFacets()

    expect(facets.brands).toEqual(['Continental', 'Michelin', 'Nokian'])
    expect(facets.sizes).toContain('225/45R17')
  })
})

describe('försäljning', () => {
  beforeEach(resetTables)

  test('räknar ut summa och vinst och minskar lagret', () => {
    const product = createProduct(draft({ quantity: 10, purchasePrice: 1000, sellingPrice: 1500 }))
    const sale = createSale({ productId: product.id, quantity: 4, unitPrice: 1400 })

    expect(sale.total).toBe(5600)
    expect(sale.profit).toBe(1600)
    expect(getProduct(product.id)?.quantity).toBe(6)
  })

  test('går inte att sälja fler däck än som finns i lager', () => {
    const product = createProduct(draft({ quantity: 3 }))

    expect(() => createSale({ productId: product.id, quantity: 4, unitPrice: 1500 })).toThrow(
      /bara 3 st i lager/
    )
    expect(getProduct(product.id)?.quantity).toBe(3)
  })

  test('kräver ett positivt heltal som antal', () => {
    const product = createProduct(draft())

    expect(() => createSale({ productId: product.id, quantity: 0, unitPrice: 1500 })).toThrow(/positivt/)
    expect(() => createSale({ productId: product.id, quantity: 1.5, unitPrice: 1500 })).toThrow(/positivt/)
  })

  test('sparar en ögonblicksbild av produkten på försäljningen', () => {
    const product = createProduct(draft({ brand: 'Pirelli', model: 'P Zero' }))
    const sale = createSale({ productId: product.id, quantity: 1, unitPrice: 1500 })

    updateProduct(product.id, draft({ brand: 'Ändrat märke' }))

    expect(listSales()[0].brand).toBe('Pirelli')
    expect(sale.sku).toBe(product.sku)
  })

  test('ångrad försäljning lägger tillbaka däcken i lagret', () => {
    const product = createProduct(draft({ quantity: 10 }))
    const sale = createSale({ productId: product.id, quantity: 4, unitPrice: 1500 })

    deleteSale(sale.id)

    expect(getProduct(product.id)?.quantity).toBe(10)
    expect(listSales()).toHaveLength(0)
  })

  test('filtrerar historiken på datum', () => {
    const product = createProduct(draft())
    createSale({ productId: product.id, quantity: 1, unitPrice: 1500 })
    const idag = new Date().toISOString().slice(0, 10)

    expect(listSales({ from: idag, to: idag })).toHaveLength(1)
    expect(listSales({ from: '2000-01-01', to: '2000-01-02' })).toHaveLength(0)
  })
})

describe('nyckeltal', () => {
  beforeEach(resetTables)

  test('summerar lagervärde, säljvärde och lågt lager', () => {
    createProduct(draft({ quantity: 10, purchasePrice: 1000, sellingPrice: 1500 }))
    createProduct(draft({ brand: 'Andra', quantity: 2, purchasePrice: 500, sellingPrice: 900, lowStockThreshold: 4 }))
    createProduct(draft({ brand: 'Tredje', quantity: 0 }))

    const summary = getInventorySummary()

    expect(summary.totalProducts).toBe(3)
    expect(summary.totalTires).toBe(12)
    expect(summary.inventoryValue).toBe(11000)
    expect(summary.estimatedSalesValue).toBe(16800)
    expect(summary.estimatedProfit).toBe(5800)
    expect(summary.lowStockCount).toBe(1)
    expect(summary.outOfStockCount).toBe(1)
  })

  test('räknar dagens försäljning och ger 14 dagars trend', () => {
    const product = createProduct(draft({ purchasePrice: 1000, sellingPrice: 1500 }))
    createSale({ productId: product.id, quantity: 2, unitPrice: 1500 })

    const stats = getDashboardStats()

    expect(stats.soldToday).toBe(2)
    expect(stats.revenueToday).toBe(3000)
    expect(stats.profitToday).toBe(1000)
    expect(stats.salesTrend).toHaveLength(14)
    expect(stats.salesTrend.at(-1)?.revenue).toBe(3000)
  })
})

describe('inställningar', () => {
  beforeEach(resetTables)

  test('faller tillbaka på standardvärden', () => {
    const settings = getSettings()

    expect(settings.shopName).toBe('Din Bilverkstad')
    expect(settings.currency).toBe('SEK')
    expect(settings.autoBackupOnExit).toBe(false)
  })

  test('sparar och läser tillbaka värden med rätt typ', () => {
    saveSettings({ shopName: 'Verkstan AB', lowStockThreshold: 8, autoBackupOnExit: true })
    const settings = getSettings()

    expect(settings.shopName).toBe('Verkstan AB')
    expect(settings.lowStockThreshold).toBe(8)
    expect(settings.autoBackupOnExit).toBe(true)
  })
})

describe('tömma och nollställa', () => {
  test('tömning lämnar lager och historik tomma men behåller inställningar', () => {
    resetTables()
    const product = createProduct(draft())
    createSale({ productId: product.id, quantity: 1, unitPrice: 1500 })
    saveSettings({ shopName: 'Verkstan AB' })

    // Samma operation som IPC-hanteraren "database:clear" utför.
    const db = getDatabase()
    db.transaction(() => {
      db.run('DELETE FROM sales')
      db.run('DELETE FROM products')
      db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'sales')")
    })

    expect(listProducts()).toHaveLength(0)
    expect(listSales()).toHaveLength(0)
    expect(getSettings().shopName).toBe('Verkstan AB')
  })

  test('artikelnumren börjar om från ett efter tömning', () => {
    resetTables()

    expect(createProduct(draft()).sku).toBe('DB-00001')
  })
})

describe('däckkategorier', () => {
  beforeEach(resetTables)

  test('kategorin bestämmer säsong och dubbning', () => {
    expect(createProduct(draft({ tireType: 'dubbdack' }))).toMatchObject({
      season: 'vinter',
      studded: true,
    })
    expect(createProduct(draft({ tireType: 'friktionsdack' }))).toMatchObject({
      season: 'vinter',
      studded: false,
    })
    expect(createProduct(draft({ tireType: 'sommardack' }))).toMatchObject({
      season: 'sommar',
      studded: false,
    })
    expect(createProduct(draft({ tireType: 'ms-dack' }))).toMatchObject({
      season: 'helar',
      studded: false,
    })
  })

  test('motsägande säsong eller dubbning rättas efter kategorin', () => {
    // Ett dubbdäck kan inte sparas som odubbat sommardäck.
    const product = createProduct(draft({ tireType: 'dubbdack', season: 'sommar', studded: false }))

    expect(product.season).toBe('vinter')
    expect(product.studded).toBe(true)
  })

  test('kategorin rättas även vid uppdatering', () => {
    const product = createProduct(draft({ tireType: 'dubbdack' }))
    const updated = updateProduct(product.id, draft({ tireType: 'sommardack' }))

    expect(updated.season).toBe('sommar')
    expect(updated.studded).toBe(false)
  })

  test('räknar antal, artiklar och värde per kategori', () => {
    createProduct(draft({ tireType: 'dubbdack', quantity: 8, purchasePrice: 1000 }))
    createProduct(draft({ brand: 'B', tireType: 'friktionsdack', quantity: 4, purchasePrice: 500 }))
    createProduct(draft({ brand: 'C', tireType: 'sommardack', quantity: 2, purchasePrice: 100 }))

    const counts = getCategoryCounts()
    const find = (id: string) => counts.find((count) => count.id === id)!

    expect(find('dubbdack')).toMatchObject({ products: 1, quantity: 8, value: 8000 })
    expect(find('friktionsdack')).toMatchObject({ products: 1, quantity: 4, value: 2000 })
    expect(find('sommardack')).toMatchObject({ products: 1, quantity: 2, value: 200 })
    // Vinterdäck summerar dubb och friktion.
    expect(find('vinterdack')).toMatchObject({ products: 2, quantity: 12, value: 10000 })
    expect(find('ms-dack')).toMatchObject({ products: 0, quantity: 0 })
  })

  test('erbjuder exakt de fem kategorier en bilverkstad behöver', () => {
    expect(TIRE_CATEGORIES.map((category) => category.label)).toEqual([
      'Sommardäck',
      'Vinterdäck',
      'Dubbdäck',
      'Friktionsdäck',
      'M+S-däck',
    ])
  })
})

describe('migrering av äldre lager', () => {
  /**
   * En kund kan återställa en backup som togs innan däcktyperna förenklades.
   * Migrering 2 ska då mappa om de gamla typerna utan att tappa någon artikel.
   */
  const insertLegacy = (sku: string, tireType: string, season: string, studded: number) => {
    const now = new Date().toISOString()
    getDatabase().run(
      `INSERT INTO products
        (sku, brand, model, size, season, tire_type, studded, condition, quantity,
         purchase_price, selling_price, location, notes, low_stock_threshold, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [sku, 'Gammalt', 'Lager', '205/55R16', season, tireType, studded, 'ny', 4, 1000, 1500, '', '', 4, now, now]
    )
  }

  const rerunLatestMigration = () => {
    const db = getDatabase()
    db.run('DELETE FROM schema_migrations WHERE version = 2')
    runMigrations(db)
  }

  beforeEach(resetTables)

  test('gamla friktionstyper blir friktionsdäck', () => {
    insertLegacy('L-1', 'nordisk-friktion', 'vinter', 0)
    insertLegacy('L-2', 'europeisk-friktion', 'vinter', 0)
    insertLegacy('L-3', 'friktion', 'vinter', 0)

    rerunLatestMigration()

    expect(listProducts().every((p) => p.tireType === 'friktionsdack')).toBe(true)
  })

  test('helårsdäck blir M+S-däck', () => {
    insertLegacy('L-4', 'helarsdack', 'helar', 0)

    rerunLatestMigration()

    expect(listProducts()[0]).toMatchObject({ tireType: 'ms-dack', season: 'helar' })
  })

  test('lastbils- och transportdäck flyttas till personbilskategorier', () => {
    insertLegacy('L-5', 'transportdack', 'sommar', 0)
    insertLegacy('L-6', 'lastbil', 'vinter', 1)
    insertLegacy('L-7', 'suv', 'vinter', 0)

    rerunLatestMigration()

    const byNumber = Object.fromEntries(listProducts().map((p) => [p.sku, p.tireType]))
    expect(byNumber['L-5']).toBe('sommardack')
    expect(byNumber['L-6']).toBe('dubbdack')
    expect(byNumber['L-7']).toBe('friktionsdack')
  })

  test('okända typer hamnar på säsongens standardkategori', () => {
    insertLegacy('L-8', 'nagot-helt-annat', 'vinter', 0)

    rerunLatestMigration()

    expect(listProducts()[0].tireType).toBe('vinterdack')
  })

  test('inga artiklar tappas bort i migreringen', () => {
    insertLegacy('L-9', 'mc', 'sommar', 0)
    insertLegacy('L-10', 'helarsdack', 'helar', 0)
    insertLegacy('L-11', 'dubbdack', 'vinter', 1)

    rerunLatestMigration()

    expect(listProducts()).toHaveLength(3)
    expect(
      listProducts().every((p) =>
        ['sommardack', 'vinterdack', 'dubbdack', 'friktionsdack', 'ms-dack'].includes(p.tireType)
      )
    ).toBe(true)
  })

  test('säsong och dubbning stämmer med kategorin efter migrering', () => {
    insertLegacy('L-12', 'dubbdack', 'sommar', 0)

    rerunLatestMigration()

    expect(listProducts()[0]).toMatchObject({ season: 'vinter', studded: true })
  })
})
