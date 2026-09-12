import type { Condition, Season, TireCategoryId } from './types'

/**
 * Demodata för en svensk bilverkstad — endast för utveckling och
 * webbförhandsvisning. Den installerade appen startar med tomt lager.
 */
export interface DemoProduct {
  brand: string
  model: string
  size: string
  season: Season
  tireType: TireCategoryId
  studded: boolean
  condition: Condition
  quantity: number
  purchasePrice: number
  sellingPrice: number
  location: string
  notes?: string
}

/** Delar upp en dimensionssträng som "205/55R16" i bredd, profil och fälg. */
export function parseDimension(size: string) {
  const match = /^(\d{2,3})\s*[/\-\s]\s*(\d{2,3})\s*(?:ZR|R|[/\-\s])?\s*(\d{2}(?:\.\d)?)/i.exec(
    size.trim()
  )
  if (!match) return { width: null, profile: null, rim: null }
  return { width: Number(match[1]), profile: Number(match[2]), rim: Number(match[3]) }
}

/** Deterministisk pseudoslump så demodatan ser likadan ut varje gång. */
export function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export const DEMO_SALES_SEED = 20260421
export const DEMO_HISTORY_DAYS = 75

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Vinter — dubbdäck
  { brand: 'Nokian', model: 'Hakkapeliitta 10', size: '205/55R16', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'ny', quantity: 16, purchasePrice: 1290, sellingPrice: 1990, location: 'Lager A · Hylla 1' },
  { brand: 'Nokian', model: 'Hakkapeliitta 10 SUV', size: '235/55R18', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'ny', quantity: 8, purchasePrice: 1890, sellingPrice: 2790, location: 'Lager A · Hylla 2' },
  { brand: 'Continental', model: 'IceContact 3', size: '225/45R17', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'ny', quantity: 12, purchasePrice: 1450, sellingPrice: 2190, location: 'Lager A · Hylla 2' },
  { brand: 'Gislaved', model: 'Nord*Frost 200', size: '195/65R15', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'ny', quantity: 20, purchasePrice: 890, sellingPrice: 1390, location: 'Lager A · Hylla 3' },
  { brand: 'Michelin', model: 'X-Ice North 4', size: '215/60R16', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'ny', quantity: 4, purchasePrice: 1590, sellingPrice: 2390, location: 'Lager A · Hylla 3' },
  { brand: 'Bridgestone', model: 'Noranza 001', size: '205/60R16', season: 'vinter', tireType: 'dubbdack', studded: true, condition: 'begagnad', quantity: 4, purchasePrice: 450, sellingPrice: 890, location: 'Lager C · Begagnat', notes: 'Ca 6 mm mönsterdjup. Fullt dubbantal.' },

  // Vinter — friktion
  { brand: 'Nokian', model: 'Hakkapeliitta R5', size: '205/55R16', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 12, purchasePrice: 1350, sellingPrice: 2090, location: 'Lager A · Hylla 4' },
  { brand: 'Michelin', model: 'X-Ice Snow', size: '225/45R17', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 8, purchasePrice: 1490, sellingPrice: 2290, location: 'Lager A · Hylla 4' },
  { brand: 'Continental', model: 'VikingContact 7', size: '235/45R18', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 6, purchasePrice: 1690, sellingPrice: 2490, location: 'Lager A · Hylla 5' },
  { brand: 'Goodyear', model: 'UltraGrip Ice 2', size: '195/65R15', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 14, purchasePrice: 990, sellingPrice: 1590, location: 'Lager A · Hylla 5' },
  { brand: 'Pirelli', model: 'Ice Zero FR', size: '215/65R16', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 3, purchasePrice: 1290, sellingPrice: 1990, location: 'Lager B · Hylla 1' },
  { brand: 'Hankook', model: 'Winter i*cept RS3', size: '175/65R14', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 16, purchasePrice: 690, sellingPrice: 1090, location: 'Lager B · Hylla 1' },
  { brand: 'Nokian', model: 'Snowproof P', size: '245/40R18', season: 'vinter', tireType: 'friktionsdack', studded: false, condition: 'ny', quantity: 2, purchasePrice: 1790, sellingPrice: 2690, location: 'Lager B · Hylla 2' },

  // Sommar
  { brand: 'Michelin', model: 'Primacy 4+', size: '205/55R16', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 24, purchasePrice: 1090, sellingPrice: 1690, location: 'Lager B · Hylla 3' },
  { brand: 'Continental', model: 'PremiumContact 7', size: '225/45R17', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 16, purchasePrice: 1190, sellingPrice: 1890, location: 'Lager B · Hylla 3' },
  { brand: 'Goodyear', model: 'EfficientGrip Performance 2', size: '195/65R15', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 18, purchasePrice: 790, sellingPrice: 1290, location: 'Lager B · Hylla 4' },
  { brand: 'Bridgestone', model: 'Turanza T005', size: '215/60R16', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 10, purchasePrice: 990, sellingPrice: 1590, location: 'Lager B · Hylla 4' },
  { brand: 'Pirelli', model: 'P Zero PZ4', size: '245/40R19', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 4, purchasePrice: 2290, sellingPrice: 3390, location: 'Lager B · Hylla 5' },
  { brand: 'Hankook', model: 'Ventus Prime4', size: '225/40R18', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 8, purchasePrice: 1090, sellingPrice: 1690, location: 'Lager B · Hylla 5' },
  { brand: 'Nokian', model: 'Wetproof 1', size: '205/60R16', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 12, purchasePrice: 890, sellingPrice: 1490, location: 'Lager B · Hylla 6' },
  { brand: 'Kumho', model: 'Ecsta HS52', size: '195/55R16', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 2, purchasePrice: 640, sellingPrice: 1090, location: 'Lager B · Hylla 6' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '255/35R19', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 4, purchasePrice: 2490, sellingPrice: 3690, location: 'Lager D · Premium' },
  { brand: 'Continental', model: 'PremiumContact 6', size: '235/55R18', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'ny', quantity: 6, purchasePrice: 1590, sellingPrice: 2390, location: 'Lager D · Premium' },
  { brand: 'Toyo', model: 'Proxes Comfort', size: '215/55R17', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'begagnad', quantity: 4, purchasePrice: 390, sellingPrice: 790, location: 'Lager C · Begagnat', notes: 'Ca 5,5 mm. Jämnt slitage.' },
  { brand: 'Vredestein', model: 'Ultrac', size: '205/50R17', season: 'sommar', tireType: 'sommardack', studded: false, condition: 'begagnad', quantity: 2, purchasePrice: 350, sellingPrice: 690, location: 'Lager C · Begagnat', notes: 'Ca 4 mm. Säljs parvis.' },

  // Helår
  { brand: 'Goodyear', model: 'Vector 4Seasons Gen-3', size: '205/55R16', season: 'helar', tireType: 'ms-dack', studded: false, condition: 'ny', quantity: 8, purchasePrice: 1190, sellingPrice: 1790, location: 'Lager B · Hylla 7' },
  { brand: 'Michelin', model: 'CrossClimate 2', size: '225/45R17', season: 'helar', tireType: 'ms-dack', studded: false, condition: 'ny', quantity: 6, purchasePrice: 1490, sellingPrice: 2190, location: 'Lager B · Hylla 7' },
  { brand: 'Nokian', model: 'Seasonproof', size: '195/65R15', season: 'helar', tireType: 'ms-dack', studded: false, condition: 'ny', quantity: 0, purchasePrice: 990, sellingPrice: 1590, location: 'Lager B · Hylla 7', notes: 'Slut i lager — beställd hos grossist.' },

  // Fler vinter- och helårsalternativ
  { brand: 'Continental', model: 'WinterContact TS 870', size: '205/55R16', season: 'vinter', tireType: 'vinterdack', studded: false, condition: 'ny', quantity: 8, purchasePrice: 1190, sellingPrice: 1890, location: 'Lager A · Hylla 6' },
  { brand: 'Dunlop', model: 'Winter Sport 5', size: '225/45R17', season: 'vinter', tireType: 'vinterdack', studded: false, condition: 'ny', quantity: 4, purchasePrice: 1290, sellingPrice: 1990, location: 'Lager A · Hylla 6' },
  { brand: 'Falken', model: 'EuroAll Season AS210', size: '205/55R16', season: 'helar', tireType: 'ms-dack', studded: false, condition: 'ny', quantity: 3, purchasePrice: 990, sellingPrice: 1590, location: 'Lager B · Hylla 7' },
]
