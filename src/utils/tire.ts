import { SEASONS, TIRE_CATEGORIES, CONDITIONS, tireCategory } from '@shared/constants'
import type { Condition, Product, Season, StockStatus, TireCategoryId } from '@/types'

export { SEASONS, TIRE_CATEGORIES, CONDITIONS, tireCategory }

export const seasonLabel = (season: Season): string =>
  SEASONS.find((item) => item.value === season)?.label ?? season

export const conditionLabel = (condition: Condition): string =>
  CONDITIONS.find((item) => item.value === condition)?.label ?? condition

export const tireTypeLabel = (id: string): string => tireCategory(id)?.label ?? id

export const tireTypeShort = (id: string): string => tireCategory(id)?.short ?? id

/** Färgen följer säsongen så att dubb och friktion känns igen som vinterdäck. */
export const categoryColor = (id: TireCategoryId): string => {
  const category = tireCategory(id)
  return category ? seasonColor(category.season) : 'var(--text-muted)'
}

export const categoryBadgeClass = (id: TireCategoryId): string => {
  const category = tireCategory(id)
  return category ? seasonBadgeClass(category.season) : 'badge-neutral'
}

export const seasonBadgeClass = (season: Season): string =>
  season === 'vinter' ? 'badge-winter' : season === 'sommar' ? 'badge-summer' : 'badge-all'

export const seasonColor = (season: Season): string =>
  season === 'vinter'
    ? 'var(--season-winter)'
    : season === 'sommar'
      ? 'var(--season-summer)'
      : 'var(--season-all)'

/** Kategorier som hör till en säsong — används av lagerfiltret. */
export const categoriesForSeason = (season: Season) =>
  TIRE_CATEGORIES.filter((category) => category.season === season)

export function stockStatus(product: Pick<Product, 'quantity' | 'lowStockThreshold'>): StockStatus {
  if (product.quantity <= 0) return 'out'
  if (product.quantity <= product.lowStockThreshold) return 'low'
  return 'in-stock'
}

export const stockStatusLabel: Record<StockStatus, string> = {
  'in-stock': 'I lager',
  low: 'Lågt lager',
  out: 'Slut',
}

export const stockStatusBadge: Record<StockStatus, string> = {
  'in-stock': 'badge-success',
  low: 'badge-warning',
  out: 'badge-danger',
}

/**
 * Normaliserar det användaren skriver i dimensionsfältet.
 * "2055516", "205 55 16" och "205/55r16" blir alla "205/55R16".
 */
export function normalizeDimension(input: string): string {
  const trimmed = input.trim().toUpperCase()
  if (!trimmed) return ''

  const digitsOnly = trimmed.replace(/[^0-9]/g, '')
  if (/^[0-9]+$/.test(trimmed) && digitsOnly.length === 7) {
    return `${digitsOnly.slice(0, 3)}/${digitsOnly.slice(3, 5)}R${digitsOnly.slice(5, 7)}`
  }

  // Avgränsaren före fälgdiametern kan vara R/ZR, snedstreck, bindestreck eller mellanslag.
  const match = /^(\d{2,3})\s*[/\-\s]\s*(\d{2,3})\s*(?:ZR|R|[/\-\s])?\s*(\d{2}(?:\.\d)?)\s*(C)?$/.exec(
    trimmed
  )
  if (match) {
    return `${match[1]}/${match[2]}R${match[3]}${match[4] ?? ''}`
  }
  return trimmed
}

/**
 * Formaterar dimensionen medan användaren skriver.
 *
 * Siffrorna plockas ut och snedstreck respektive R sätts in automatiskt, så
 * "2055516", "20555r16" och "205 55 16" ger alla "205/55R16" utan att man
 * behöver skriva skiljetecknen själv.
 *
 * Vid radering läggs inga nya skiljetecken till — annars går det inte att
 * backa förbi ett automatiskt insatt "/" eller "R".
 */
export function formatDimensionInput(raw: string, previous = ''): string {
  const isDeleting = raw.length < previous.length
  const upper = raw.toUpperCase()
  const endsWithC = /C\s*$/.test(upper)

  const digits = upper.replace(/[^0-9]/g, '').slice(0, MAX_DIMENSION_DIGITS)
  if (digits.length === 0) return ''

  let result = digits.slice(0, 3)
  if (digits.length > 3 || (digits.length === 3 && !isDeleting)) {
    result += `/${digits.slice(3, 5)}`
  }
  if (digits.length > 5 || (digits.length === 5 && !isDeleting)) {
    result += `R${digits.slice(5, 7)}`
  }
  if (endsWithC && digits.length === MAX_DIMENSION_DIGITS) result += 'C'

  return result
}

const MAX_DIMENSION_DIGITS = 7

export function isValidDimension(value: string): boolean {
  return /^\d{2,3}\/\d{2,3}R\d{2}(\.\d)?C?$/.test(normalizeDimension(value))
}

export const productLabel = (product: Pick<Product, 'brand' | 'model'>): string =>
  `${product.brand} ${product.model}`.trim()

/** Bruttomarginal i procent — visas i lager- och försäljningsvyer. */
export function margin(purchasePrice: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0
  return ((sellingPrice - purchasePrice) / sellingPrice) * 100
}
