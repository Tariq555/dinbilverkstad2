import type { Sale, SaleDraft, SaleFilters } from '@shared/types'
import { getDatabase } from '../db'
import { getProduct } from './productRepository'

interface SaleRow {
  id: number
  product_id: number | null
  sku: string
  brand: string
  model: string
  size: string
  season: string
  quantity: number
  unit_price: number
  unit_purchase_price: number
  total: number
  profit: number
  sold_at: string
  note: string
}

const toSale = (row: SaleRow): Sale => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku,
  brand: row.brand,
  model: row.model,
  size: row.size,
  season: row.season as Sale['season'],
  quantity: row.quantity,
  unitPrice: row.unit_price,
  unitPurchasePrice: row.unit_purchase_price,
  total: row.total,
  profit: row.profit,
  soldAt: row.sold_at,
  note: row.note,
})

export function listSales(filters: SaleFilters = {}): Sale[] {
  const db = getDatabase()
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`
    where.push('(LOWER(brand) LIKE ? OR LOWER(model) LIKE ? OR LOWER(size) LIKE ? OR LOWER(sku) LIKE ?)')
    params.push(term, term, term, term)
  }
  if (filters.from) {
    where.push('sold_at >= ?')
    params.push(`${filters.from}T00:00:00.000Z`)
  }
  if (filters.to) {
    where.push('sold_at <= ?')
    params.push(`${filters.to}T23:59:59.999Z`)
  }

  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(filters.limit ?? 500, 2000)

  return db
    .all<SaleRow>(`SELECT * FROM sales ${clause} ORDER BY sold_at DESC, id DESC LIMIT ?`, [
      ...params,
      limit,
    ])
    .map(toSale)
}

/**
 * Registrerar en försäljning och minskar lagersaldot i samma transaktion.
 * Går aldrig att sälja fler däck än vad som finns i lager.
 */
export function createSale(draft: SaleDraft): Sale {
  const db = getDatabase()
  const product = getProduct(draft.productId)

  if (!product) throw new Error('Produkten hittades inte.')
  if (!Number.isInteger(draft.quantity) || draft.quantity <= 0) {
    throw new Error('Antal måste vara ett positivt heltal.')
  }
  if (draft.quantity > product.quantity) {
    throw new Error(
      `Det finns bara ${product.quantity} st i lager av ${product.brand} ${product.model}.`
    )
  }
  if (draft.unitPrice < 0) throw new Error('Priset kan inte vara negativt.')

  const soldAt = new Date().toISOString()
  const total = draft.unitPrice * draft.quantity
  const profit = (draft.unitPrice - product.purchasePrice) * draft.quantity

  const id = db.transaction(() => {
    db.run(
      `INSERT INTO sales
        (product_id, sku, brand, model, size, season, quantity, unit_price,
         unit_purchase_price, total, profit, sold_at, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        product.id,
        product.sku,
        product.brand,
        product.model,
        product.size,
        product.season,
        draft.quantity,
        draft.unitPrice,
        product.purchasePrice,
        total,
        profit,
        soldAt,
        draft.note?.trim() ?? '',
      ]
    )
    const saleId = db.lastInsertId()
    db.run('UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?', [
      draft.quantity,
      soldAt,
      product.id,
    ])
    return saleId
  })

  return toSale(db.one<SaleRow>('SELECT * FROM sales WHERE id = ?', [id])!)
}

/** Ångrar en försäljning och lägger tillbaka däcken i lagret. */
export function deleteSale(id: number): void {
  const db = getDatabase()
  const sale = db.one<SaleRow>('SELECT * FROM sales WHERE id = ?', [id])
  if (!sale) throw new Error('Försäljningen hittades inte.')

  db.transaction(() => {
    if (sale.product_id !== null) {
      db.run('UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?', [
        sale.quantity,
        new Date().toISOString(),
        sale.product_id,
      ])
    }
    db.run('DELETE FROM sales WHERE id = ?', [id])
  })
}
