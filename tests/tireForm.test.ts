import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/constants'
import {
  emptyForm,
  formFromProduct,
  keepStickyFields,
  toDraft,
  validateForm,
} from '../src/features/tires/tireForm'
import type { TireFormValues } from '../src/features/tires/tireForm'
import type { AppSettings, Product } from '@shared/types'

const settings: AppSettings = { ...DEFAULT_SETTINGS, defaultQuantity: 4, defaultLocation: 'Lager A' }

const filled = () => ({
  ...emptyForm(settings),
  brand: 'Michelin',
  model: 'X-Ice Snow',
  size: '2055516',
  purchasePrice: '1200',
  sellingPrice: '1800',
})

describe('validateForm', () => {
  test('godkänner ett ifyllt formulär', () => {
    expect(validateForm(filled())).toEqual({})
  })

  test('kräver märke och dimension', () => {
    const errors = validateForm({ ...filled(), brand: '  ', size: '' })

    expect(errors.brand).toBeDefined()
    expect(errors.size).toBeDefined()
  })

  test('påpekar felaktigt dimensionsformat', () => {
    expect(validateForm({ ...filled(), size: '205/55' }).size).toMatch(/205\/55R16/)
  })

  test('avvisar negativt antal och negativa priser', () => {
    expect(validateForm({ ...filled(), quantity: '-1' }).quantity).toBeDefined()
    expect(validateForm({ ...filled(), purchasePrice: '-5' }).purchasePrice).toBeDefined()
    expect(validateForm({ ...filled(), sellingPrice: '-5' }).sellingPrice).toBeDefined()
  })

  test('tillåter tomma prisfält', () => {
    const errors = validateForm({ ...filled(), purchasePrice: '', sellingPrice: '' })

    expect(errors.purchasePrice).toBeUndefined()
    expect(errors.sellingPrice).toBeUndefined()
  })
})

describe('toDraft', () => {
  test('normaliserar dimension och trimmar text', () => {
    const draft = toDraft({ ...filled(), brand: '  Michelin  ', size: '2055516' })

    expect(draft.brand).toBe('Michelin')
    expect(draft.size).toBe('205/55R16')
  })

  test('accepterar komma som decimaltecken i priser', () => {
    expect(toDraft({ ...filled(), purchasePrice: '1200,50' }).purchasePrice).toBe(1200.5)
  })

  test('avrundar antal till heltal', () => {
    expect(toDraft({ ...filled(), quantity: '4,7' }).quantity).toBe(5)
  })
})

describe('däckkategori', () => {
  test('kategorin avgör säsong och dubbning i utkastet', () => {
    expect(toDraft({ ...filled(), category: 'dubbdack' })).toMatchObject({
      season: 'vinter',
      studded: true,
      tireType: 'dubbdack',
    })
    expect(toDraft({ ...filled(), category: 'friktionsdack' })).toMatchObject({
      season: 'vinter',
      studded: false,
    })
    expect(toDraft({ ...filled(), category: 'sommardack' })).toMatchObject({
      season: 'sommar',
      studded: false,
    })
    expect(toDraft({ ...filled(), category: 'ms-dack' })).toMatchObject({
      season: 'helar',
      studded: false,
    })
  })

  test('nya formulär börjar på vinterdäck', () => {
    expect(emptyForm(settings).category).toBe('vinterdack')
  })

  test('kräver en giltig kategori', () => {
    const errors = validateForm({ ...filled(), category: 'lastbil' as TireFormValues['category'] })

    expect(errors.category).toBeDefined()
  })
})

describe('snabbinmatning', () => {
  test('behåller märke, kategori och placering till nästa däck', () => {
    const sparat = { ...filled(), location: 'Lager B · Hylla 2', category: 'dubbdack' as const }
    const nasta = keepStickyFields(sparat, settings)

    expect(nasta.brand).toBe('Michelin')
    expect(nasta.location).toBe('Lager B · Hylla 2')
    expect(nasta.category).toBe('dubbdack')
  })

  test('rensar modell, dimension och priser till nästa däck', () => {
    const nasta = keepStickyFields(filled(), settings)

    expect(nasta.model).toBe('')
    expect(nasta.size).toBe('')
    expect(nasta.purchasePrice).toBe('')
    expect(nasta.sellingPrice).toBe('')
  })
})

describe('formFromProduct', () => {
  test('fyller formuläret från en sparad produkt', () => {
    const product = {
      brand: 'Nokian',
      model: 'Hakkapeliitta 10',
      size: '205/55R16',
      season: 'vinter',
      tireType: 'dubbdack',
      studded: true,
      condition: 'ny',
      quantity: 16,
      purchasePrice: 1290,
      sellingPrice: 1990,
      location: 'Lager A',
      notes: 'Anteckning',
      lowStockThreshold: 4,
    } as Product

    const form = formFromProduct(product)

    expect(form.brand).toBe('Nokian')
    expect(form.quantity).toBe('16')
    expect(form.sellingPrice).toBe('1990')
    expect(form.category).toBe('dubbdack')
  })
})
