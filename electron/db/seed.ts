import { DEMO_PRODUCTS, DEMO_HISTORY_DAYS, DEMO_SALES_SEED, createRandom, parseDimension } from '@shared/demoData'
import type { SqliteDatabase } from './engine'

export { parseDimension }

const pad = (value: number, length = 5) => String(value).padStart(length, '0')

/**
 * Fyller en tom databas med realistisk demodata.
 * Körs aldrig om det redan finns produkter — riktig data skrivs inte över.
 */
export function seedDemoData(db: SqliteDatabase): void {
  const existing = db.one<{ count: number }>('SELECT COUNT(*) AS count FROM products')
  if ((existing?.count ?? 0) > 0) return

  const now = new Date()

  db.transaction(() => {
    DEMO_PRODUCTS.forEach((product, index) => {
      const dimension = parseDimension(product.size)
      const created = new Date(now.getTime() - (DEMO_PRODUCTS.length - index) * 36e5 * 12)
      db.run(
        `INSERT INTO products
          (sku, brand, model, size, width, profile, rim, season, tire_type, studded, condition,
           quantity, purchase_price, selling_price, location, notes, low_stock_threshold, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          `DB-${pad(index + 1)}`,
          product.brand,
          product.model,
          product.size,
          dimension.width,
          dimension.profile,
          dimension.rim,
          product.season,
          product.tireType,
          product.studded ? 1 : 0,
          product.condition,
          product.quantity,
          product.purchasePrice,
          product.sellingPrice,
          product.location,
          product.notes ?? '',
          4,
          created.toISOString(),
          created.toISOString(),
        ]
      )
    })

    seedSalesHistory(db, now)
  })
}

/** Skapar ~75 dagars försäljningshistorik så diagram och rapporter har innehåll. */
function seedSalesHistory(db: SqliteDatabase, now: Date): void {
  const products = db.all<{
    id: number
    sku: string
    brand: string
    model: string
    size: string
    season: string
    purchase_price: number
    selling_price: number
  }>('SELECT id, sku, brand, model, size, season, purchase_price, selling_price FROM products')

  if (products.length === 0) return

  const random = createRandom(DEMO_SALES_SEED)

  for (let dayOffset = DEMO_HISTORY_DAYS; dayOffset >= 0; dayOffset--) {
    const date = new Date(now)
    date.setDate(date.getDate() - dayOffset)
    if (date.getDay() === 0) continue

    const saleCount = (date.getDay() === 6 ? 1 : 2) + Math.floor(random() * 3)

    for (let index = 0; index < saleCount; index++) {
      const product = products[Math.floor(random() * products.length)]
      const quantity = random() > 0.75 ? 2 : 4
      const discount = random() > 0.8 ? Math.round(product.selling_price * 0.05) : 0
      const unitPrice = Math.max(0, product.selling_price - discount)
      const soldAt = new Date(date)
      soldAt.setHours(8 + Math.floor(random() * 9), Math.floor(random() * 60), 0, 0)

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
          quantity,
          unitPrice,
          product.purchase_price,
          unitPrice * quantity,
          (unitPrice - product.purchase_price) * quantity,
          soldAt.toISOString(),
          discount > 0 ? 'Kampanjpris' : '',
        ]
      )
    }
  }
}
