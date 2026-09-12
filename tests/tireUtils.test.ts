import { describe, expect, test } from 'vitest'
import {
  formatDimensionInput,
  isValidDimension,
  margin,
  normalizeDimension,
  seasonBadgeClass,
  seasonLabel,
  stockStatus,
  tireTypeLabel,
  categoriesForSeason,
} from '../src/utils/tire'
import { parseDimension } from '@shared/demoData'

describe('normalizeDimension', () => {
  test('formaterar sju sammanhängande siffror', () => {
    expect(normalizeDimension('2055516')).toBe('205/55R16')
  })

  test('accepterar mellanslag och bindestreck som avgränsare', () => {
    expect(normalizeDimension('205 55 16')).toBe('205/55R16')
    expect(normalizeDimension('205-55-16')).toBe('205/55R16')
  })

  test('normaliserar gemener och saknat R', () => {
    expect(normalizeDimension('205/55r16')).toBe('205/55R16')
    expect(normalizeDimension('195/65 15')).toBe('195/65R15')
  })

  test('behåller C-märkning för transportdäck', () => {
    expect(normalizeDimension('215/65r16c')).toBe('215/65R16C')
  })

  test('returnerar tom sträng för tom inmatning', () => {
    expect(normalizeDimension('   ')).toBe('')
  })
})

describe('isValidDimension', () => {
  test('godkänner giltiga dimensioner', () => {
    expect(isValidDimension('205/55R16')).toBe(true)
    expect(isValidDimension('2055516')).toBe(true)
    expect(isValidDimension('215/65R16C')).toBe(true)
  })

  test('avvisar ofullständig eller felaktig inmatning', () => {
    expect(isValidDimension('205/55')).toBe(false)
    expect(isValidDimension('abc')).toBe(false)
    expect(isValidDimension('')).toBe(false)
  })
})

describe('stockStatus', () => {
  test('slut när saldot är noll eller lägre', () => {
    expect(stockStatus({ quantity: 0, lowStockThreshold: 4 })).toBe('out')
  })

  test('lågt lager vid eller under gränsen', () => {
    expect(stockStatus({ quantity: 4, lowStockThreshold: 4 })).toBe('low')
    expect(stockStatus({ quantity: 1, lowStockThreshold: 4 })).toBe('low')
  })

  test('i lager över gränsen', () => {
    expect(stockStatus({ quantity: 5, lowStockThreshold: 4 })).toBe('in-stock')
  })
})

describe('margin', () => {
  test('räknar bruttomarginal i procent', () => {
    expect(margin(1000, 1500)).toBeCloseTo(33.33, 1)
    expect(margin(750, 1500)).toBe(50)
  })

  test('ger noll när försäljningspris saknas', () => {
    expect(margin(1000, 0)).toBe(0)
  })
})

describe('svenska etiketter', () => {
  test('översätter säsong och däcktyp', () => {
    expect(seasonLabel('vinter')).toBe('Vinter')
    expect(seasonLabel('helar')).toBe('Helår')
    expect(tireTypeLabel('dubbdack')).toBe('Dubbdäck')
    expect(tireTypeLabel('friktionsdack')).toBe('Friktionsdäck')
    expect(tireTypeLabel('ms-dack')).toBe('M+S-däck')
  })

  test('faller tillbaka på id:t för okänd däcktyp', () => {
    expect(tireTypeLabel('okand-typ')).toBe('okand-typ')
  })

  test('ger rätt färgklass per säsong', () => {
    expect(seasonBadgeClass('vinter')).toBe('badge-winter')
    expect(seasonBadgeClass('sommar')).toBe('badge-summer')
    expect(seasonBadgeClass('helar')).toBe('badge-all')
  })
})

describe('categoriesForSeason', () => {
  test('vinter innehåller vinterdäck, dubbdäck och friktionsdäck', () => {
    const vinter = categoriesForSeason('vinter').map((category) => category.id)

    expect(vinter).toEqual(['vinterdack', 'dubbdack', 'friktionsdack'])
    expect(vinter).not.toContain('sommardack')
  })

  test('sommar och helår har varsin kategori', () => {
    expect(categoriesForSeason('sommar').map((c) => c.id)).toEqual(['sommardack'])
    expect(categoriesForSeason('helar').map((c) => c.id)).toEqual(['ms-dack'])
  })

  test('bara dubbdäck är markerat som dubbat', () => {
    const studded = categoriesForSeason('vinter').filter((category) => category.studded)

    expect(studded.map((category) => category.id)).toEqual(['dubbdack'])
  })
})

describe('parseDimension', () => {
  test('plockar ut bredd, profil och fälg', () => {
    expect(parseDimension('205/55R16')).toEqual({ width: 205, profile: 55, rim: 16 })
  })

  test('klarar samma avgränsare som inmatningsfältet', () => {
    expect(parseDimension('205-55-16')).toEqual({ width: 205, profile: 55, rim: 16 })
    expect(parseDimension('205 55 16')).toEqual({ width: 205, profile: 55, rim: 16 })
  })

  test('klarar transportdäck och lågprofil', () => {
    expect(parseDimension('215/65R16C')).toEqual({ width: 215, profile: 65, rim: 16 })
    expect(parseDimension('255/35ZR19')).toEqual({ width: 255, profile: 35, rim: 19 })
  })

  test('ger null när dimensionen inte går att tolka', () => {
    expect(parseDimension('ingen dimension')).toEqual({ width: null, profile: null, rim: null })
  })
})

describe('formatDimensionInput', () => {
  /** Simulerar att någon skriver tecken för tecken i fältet. */
  const type = (text: string) =>
    [...text].reduce((current, char) => formatDimensionInput(current + char, current), '')

  test('sätter in snedstreck och R medan man skriver siffror', () => {
    expect(type('2055516')).toBe('205/55R16')
  })

  test('formaterar stegvis på vägen', () => {
    expect(type('205')).toBe('205/')
    expect(type('20555')).toBe('205/55R')
    expect(type('205551')).toBe('205/55R1')
  })

  test('accepterar att användaren själv skriver skiljetecken', () => {
    expect(type('205/55R16')).toBe('205/55R16')
    expect(type('205-55-16')).toBe('205/55R16')
    expect(type('205 55 16')).toBe('205/55R16')
  })

  test('gör om litet r till stort R', () => {
    expect(formatDimensionInput('20555r16')).toBe('205/55R16')
  })

  test('hanterar inklistrad text', () => {
    expect(formatDimensionInput('195/65R15')).toBe('195/65R15')
    expect(formatDimensionInput('1956515')).toBe('195/65R15')
  })

  test('lägger inte till skiljetecken när man raderar', () => {
    // Från "205/55R16" backar användaren bort en siffra i taget.
    expect(formatDimensionInput('205/55R1', '205/55R16')).toBe('205/55R1')
    expect(formatDimensionInput('205/55R', '205/55R1')).toBe('205/55')
    expect(formatDimensionInput('205/5', '205/55')).toBe('205/5')
    expect(formatDimensionInput('205/', '205/5')).toBe('205')
  })

  test('behåller C-märkning för transportdäck', () => {
    expect(formatDimensionInput('215/65R16C')).toBe('215/65R16C')
  })

  test('ignorerar bokstäver och extra siffror', () => {
    expect(formatDimensionInput('abc205xy55R16')).toBe('205/55R16')
    expect(formatDimensionInput('205551699999')).toBe('205/55R16')
  })

  test('tomt fält förblir tomt', () => {
    expect(formatDimensionInput('')).toBe('')
    expect(formatDimensionInput('abc')).toBe('')
  })

  test('resultatet godkänns av valideringen', () => {
    expect(isValidDimension(type('2055516'))).toBe(true)
    expect(isValidDimension(type('1956515'))).toBe(true)
  })
})
