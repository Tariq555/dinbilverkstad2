import type {
  CategoryCount,
  Product,
  ProductDraft,
  ProductFilters,
  ProductSortField,
  TireCategoryId,
} from '@shared/types'
import { TIRE_CATEGORIES, tireCategory } from '@shared/constants'
import { getDatabase } from '../db'
import { parseDimension } from '../db/seed'

interface ProductRow {
  id: number
  sku: string
  brand: string
  model: string
  size: string
  width: number | null
  profile: number | null
  rim: number | null
  season: string
  tire_type: string
  studded: number
  condition: string
  quantity: number
  purchase_price: number
  selling_price: number
  location: string
  notes: string
  low_stock_threshold: number
  created_at: string
  updated_at: string
}

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  sku: row.sku,
  brand: row.brand,
  model: row.model,
  size: row.size,
  width: row.width,
  profile: row.profile,
  rim: row.rim,
  season: row.season as Product['season'],
  tireType: row.tire_type as TireCategoryId,
  studded: row.studded === 1,
  condition: row.condition as Product['condition'],
  quantity: row.quantity,
  purchasePrice: row.purchase_price,
  sellingPrice: row.selling_price,
  location: row.location,
  notes: row.notes,
  lowStockThreshold: row.low_stock_threshold,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const SORT_COLUMNS: Record<ProductSortField, string> = {
  brand: 'brand',
  model: 'model',
  size: 'rim, width, profile',
  season: 'season',
  quantity: 'quantity',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  location: 'location',
  updatedAt: 'updated_at',
}

export function listProducts(filters: ProductFilters = {}): Product[] {
  const db = getDatabase()
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`
    where.push(
      '(LOWER(brand) LIKE ? OR LOWER(model) LIKE ? OR LOWER(size) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(location) LIKE ?)'
    )
    params.push(term, term, term, term, term)
  }
  if (filters.season && filters.season !== 'all') {
    where.push('season = ?')
    params.push(filters.season)
  }
  if (filters.brand && filters.brand !== 'all') {
    where.push('brand = ?')
    params.push(filters.brand)
  }
  if (filters.size && filters.size !== 'all') {
    where.push('size = ?')
    params.push(filters.size)
  }
  if (filters.category && filters.category !== 'all') {
    // Vinterdäck som filter omfattar alla vinterdäck — även dubb och friktion.
    if (filters.category === 'vinterdack') {
      where.push('season = ?')
      params.push('vinter')
    } else {
      where.push('tire_type = ?')
      params.push(filters.category)
    }
  }
  if (filters.condition && filters.condition !== 'all') {
    where.push('condition = ?')
    params.push(filters.condition)
  }
  if (filters.studded && filters.studded !== 'all') {
    where.push('studded = ?')
    params.push(filters.studded === 'studded' ? 1 : 0)
  }
  if (filters.stockLevel === 'in-stock') where.push('quantity > 0')
  if (filters.stockLevel === 'out') where.push('quantity <= 0')
  if (filters.stockLevel === 'low') where.push('quantity > 0 AND quantity <= low_stock_threshold')

  const sortColumn = SORT_COLUMNS[filters.sortBy ?? 'updatedAt']
  const direction = filters.sortDir === 'asc' ? 'ASC' : 'DESC'
  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  return db
    .all<ProductRow>(`SELECT * FROM products ${clause} ORDER BY ${sortColumn} ${direction}, id DESC`, params)
    .map(toProduct)
}

export function getProduct(id: number): Product | null {
  const row = getDatabase().one<ProductRow>('SELECT * FROM products WHERE id = ?', [id])
  return row ? toProduct(row) : null
}

export function getFacets(): { brands: string[]; sizes: string[]; locations: string[] } {
  const db = getDatabase()
  return {
    brands: db
      .all<{ brand: string }>('SELECT DISTINCT brand FROM products ORDER BY brand COLLATE NOCASE')
      .map((row) => row.brand),
    sizes: db
      .all<{ size: string }>('SELECT DISTINCT size FROM products ORDER BY rim, width, profile')
      .map((row) => row.size),
    locations: db
      .all<{ location: string }>(
        "SELECT DISTINCT location FROM products WHERE location <> '' ORDER BY location COLLATE NOCASE"
      )
      .map((row) => row.location),
  }
}

/** Antal artiklar, däck och lagervärde per kategori — visas på dashboarden. */
export function getCategoryCounts(): CategoryCount[] {
  const rows = getDatabase().all<{
    tire_type: string
    products: number
    quantity: number
    value: number
  }>(`
    SELECT
      tire_type,
      COUNT(*)                                    AS products,
      COALESCE(SUM(quantity), 0)                  AS quantity,
      COALESCE(SUM(quantity * purchase_price), 0) AS value
    FROM products
    GROUP BY tire_type
  `)

  const byType = new Map(rows.map((row) => [row.tire_type, row]))

  return TIRE_CATEGORIES.map((category) => {
    // Vinterdäck visar summan av alla vinterdäck, inklusive dubb och friktion.
    const sources =
      category.id === 'vinterdack'
        ? TIRE_CATEGORIES.filter((item) => item.season === 'vinter').map((item) => item.id)
        : [category.id]

    return sources.reduce<CategoryCount>(
      (total, id) => {
        const row = byType.get(id)
        return {
          id: category.id,
          products: total.products + (row?.products ?? 0),
          quantity: total.quantity + (row?.quantity ?? 0),
          value: total.value + (row?.value ?? 0),
        }
      },
      { id: category.id, products: 0, quantity: 0, value: 0 }
    )
  })
}

function nextSku(): string {
  const row = getDatabase().one<{ sku: string }>(
    "SELECT sku FROM products WHERE sku LIKE 'DB-%' ORDER BY CAST(SUBSTR(sku, 4) AS INTEGER) DESC LIMIT 1"
  )
  const current = row ? Number(row.sku.slice(3)) : 0
  return `DB-${String(current + 1).padStart(5, '0')}`
}

/**
 * Kategorin är sanningen: säsong och dubbning härleds alltid därifrån så att
 * ett dubbdäck aldrig kan hamna som sommardäck i lagret.
 */
function normalizeCategory(draft: ProductDraft): {
  tireType: TireCategoryId
  season: Product['season']
  studded: boolean
} {
  const category = tireCategory(draft.tireType) ?? TIRE_CATEGORIES[0]
  return { tireType: category.id, season: category.season, studded: category.studded }
}

function validate(draft: ProductDraft): void {
  if (!draft.brand?.trim()) throw new Error('Märke måste anges.')
  if (!draft.size?.trim()) throw new Error('Dimension måste anges.')
  if (!Number.isFinite(draft.quantity) || draft.quantity < 0) throw new Error('Antal kan inte vara negativt.')
  if (draft.purchasePrice < 0) throw new Error('Inköpspris kan inte vara negativt.')
  if (draft.sellingPrice < 0) throw new Error('Försäljningspris kan inte vara negativt.')
}

export function createProduct(draft: ProductDraft): Product {
  validate(draft)
  const db = getDatabase()
  const dimension = parseDimension(draft.size)
  const category = normalizeCategory(draft)
  const timestamp = new Date().toISOString()
  const sku = draft.sku?.trim() || nextSku()

  if (db.one('SELECT id FROM products WHERE sku = ?', [sku])) {
    throw new Error(`Artikelnumret ${sku} används redan.`)
  }

  const id = db.transaction(() => {
    db.run(
      `INSERT INTO products
        (sku, brand, model, size, width, profile, rim, season, tire_type, studded, condition,
         quantity, purchase_price, selling_price, location, notes, low_stock_threshold, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        sku,
        draft.brand.trim(),
        draft.model.trim(),
        draft.size.trim(),
        draft.width ?? dimension.width,
        draft.profile ?? dimension.profile,
        draft.rim ?? dimension.rim,
        category.season,
        category.tireType,
        category.studded ? 1 : 0,
        draft.condition,
        Math.round(draft.quantity),
        draft.purchasePrice,
        draft.sellingPrice,
        draft.location.trim(),
        draft.notes.trim(),
        draft.lowStockThreshold,
        timestamp,
        timestamp,
      ]
    )
    return db.lastInsertId()
  })

  return getProduct(id)!
}

export function updateProduct(id: number, draft: ProductDraft): Product {
  validate(draft)
  const db = getDatabase()
  const existing = getProduct(id)
  if (!existing) throw new Error('Produkten hittades inte.')

  const dimension = parseDimension(draft.size)
  const category = normalizeCategory(draft)
  db.transaction(() => {
    db.run(
      `UPDATE products SET
        brand = ?, model = ?, size = ?, width = ?, profile = ?, rim = ?, season = ?, tire_type = ?,
        studded = ?, condition = ?, quantity = ?, purchase_price = ?, selling_price = ?,
        location = ?, notes = ?, low_stock_threshold = ?, updated_at = ?
       WHERE id = ?`,
      [
        draft.brand.trim(),
        draft.model.trim(),
        draft.size.trim(),
        draft.width ?? dimension.width,
        draft.profile ?? dimension.profile,
        draft.rim ?? dimension.rim,
        category.season,
        category.tireType,
        category.studded ? 1 : 0,
        draft.condition,
        Math.round(draft.quantity),
        draft.purchasePrice,
        draft.sellingPrice,
        draft.location.trim(),
        draft.notes.trim(),
        draft.lowStockThreshold,
        new Date().toISOString(),
        id,
      ]
    )
  })

  return getProduct(id)!
}

/** Justerar lagersaldo relativt (positivt = inleverans, negativt = uttag). */
export function adjustQuantity(id: number, delta: number): Product {
  const db = getDatabase()
  const product = getProduct(id)
  if (!product) throw new Error('Produkten hittades inte.')

  const next = product.quantity + delta
  if (next < 0) throw new Error('Lagersaldot kan inte bli negativt.')

  db.transaction(() => {
    db.run('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?', [
      next,
      new Date().toISOString(),
      id,
    ])
  })
  return getProduct(id)!
}

export function deleteProduct(id: number): void {
  const db = getDatabase()
  if (!getProduct(id)) throw new Error('Produkten hittades inte.')
  db.transaction(() => {
    db.run('UPDATE sales SET product_id = NULL WHERE product_id = ?', [id])
    db.run('DELETE FROM products WHERE id = ?', [id])
  })
}
