import { DEFAULT_TIRE_CATEGORY, tireCategory, TIRE_CATEGORIES } from '@shared/constants'
import type { AppSettings, Condition, Product, ProductDraft, TireCategoryId } from '@/types'
import { isValidDimension, normalizeDimension } from '@/utils/tire'

/**
 * Formuläret har ett enda däckval: kategorin.
 * Säsong och dubbning härleds därifrån, så personalen behöver bara svara på
 * en fråga — "vilken sorts däck är det här?".
 */
export interface TireFormValues {
  brand: string
  model: string
  size: string
  category: TireCategoryId
  condition: Condition
  quantity: string
  purchasePrice: string
  sellingPrice: string
  location: string
  notes: string
  lowStockThreshold: string
}

export type TireFormErrors = Partial<Record<keyof TireFormValues, string>>

export function emptyForm(settings: AppSettings): TireFormValues {
  return {
    brand: '',
    model: '',
    size: '',
    category: DEFAULT_TIRE_CATEGORY,
    condition: 'ny',
    quantity: String(settings.defaultQuantity),
    purchasePrice: settings.defaultPurchasePrice ? String(settings.defaultPurchasePrice) : '',
    sellingPrice: settings.defaultSellingPrice ? String(settings.defaultSellingPrice) : '',
    location: settings.defaultLocation,
    notes: '',
    lowStockThreshold: String(settings.lowStockThreshold),
  }
}

export function formFromProduct(product: Product): TireFormValues {
  return {
    brand: product.brand,
    model: product.model,
    size: product.size,
    category: tireCategory(product.tireType)?.id ?? DEFAULT_TIRE_CATEGORY,
    condition: product.condition,
    quantity: String(product.quantity),
    purchasePrice: String(product.purchasePrice),
    sellingPrice: String(product.sellingPrice),
    location: product.location,
    notes: product.notes,
    lowStockThreshold: String(product.lowStockThreshold),
  }
}

/**
 * Efter en sparad post behålls fält som normalt är lika för nästa däck
 * (märke, kategori, placering) så att inmatning på löpande band går fort.
 */
export function keepStickyFields(values: TireFormValues, settings: AppSettings): TireFormValues {
  return {
    ...emptyForm(settings),
    brand: values.brand,
    category: values.category,
    condition: values.condition,
    location: values.location,
    quantity: values.quantity,
  }
}

const toNumber = (value: string): number => {
  const parsed = Number(value.replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : NaN
}

export function validateForm(values: TireFormValues): TireFormErrors {
  const errors: TireFormErrors = {}

  if (!values.brand.trim()) errors.brand = 'Ange märke.'
  if (!values.size.trim()) errors.size = 'Ange dimension.'
  else if (!isValidDimension(values.size)) errors.size = 'Skriv t.ex. 205/55R16.'
  if (!TIRE_CATEGORIES.some((category) => category.id === values.category)) {
    errors.category = 'Välj däcktyp.'
  }

  const quantity = toNumber(values.quantity)
  if (Number.isNaN(quantity) || quantity < 0) errors.quantity = 'Ange ett antal på 0 eller mer.'

  const purchasePrice = toNumber(values.purchasePrice || '0')
  if (Number.isNaN(purchasePrice) || purchasePrice < 0) errors.purchasePrice = 'Ogiltigt inköpspris.'

  const sellingPrice = toNumber(values.sellingPrice || '0')
  if (Number.isNaN(sellingPrice) || sellingPrice < 0) errors.sellingPrice = 'Ogiltigt försäljningspris.'

  const threshold = toNumber(values.lowStockThreshold || '0')
  if (Number.isNaN(threshold) || threshold < 0) errors.lowStockThreshold = 'Ogiltig gräns.'

  return errors
}

export function toDraft(values: TireFormValues): ProductDraft {
  const category = tireCategory(values.category) ?? TIRE_CATEGORIES[0]

  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    size: normalizeDimension(values.size),
    width: null,
    profile: null,
    rim: null,
    season: category.season,
    tireType: category.id,
    studded: category.studded,
    condition: values.condition,
    quantity: Math.round(toNumber(values.quantity) || 0),
    purchasePrice: toNumber(values.purchasePrice || '0') || 0,
    sellingPrice: toNumber(values.sellingPrice || '0') || 0,
    location: values.location.trim(),
    notes: values.notes.trim(),
    lowStockThreshold: Math.round(toNumber(values.lowStockThreshold) || 0),
  }
}
