import { describe, expect, test } from 'vitest'
import {
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyExact,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
  formatShortDay,
  formatTime,
  plural,
  toDateInputValue,
} from '../src/utils/format'

// Intl i Node använder smalt mellanslag som tusentalsavgränsare för sv-SE.
const normalize = (value: string) => value.replace(/\s/g, ' ')

describe('formatCurrency', () => {
  test('visar hela kronor med svensk tusentalsavgränsare', () => {
    expect(normalize(formatCurrency(15000))).toBe('15 000 kr')
    expect(normalize(formatCurrency(1990))).toBe('1 990 kr')
  })

  test('avrundar ören', () => {
    expect(normalize(formatCurrency(1990.6))).toBe('1 991 kr')
  })

  test('hanterar noll och negativa belopp', () => {
    expect(normalize(formatCurrency(0))).toBe('0 kr')
    // Svensk lokalisering använder minustecken (U+2212), inte bindestreck.
    expect(normalize(formatCurrency(-500))).toBe('\u2212500 kr')
  })

  test('byter symbol med vald valuta', () => {
    expect(formatCurrency(100, 'EUR')).toContain('€')
    expect(formatCurrency(100, 'USD')).toContain('$')
  })
})

describe('formatCompactCurrency', () => {
  test('kortar tusental till tkr', () => {
    expect(normalize(formatCompactCurrency(310060))).toBe('310 tkr')
  })

  test('kortar miljoner till mkr med decimal', () => {
    expect(normalize(formatCompactCurrency(1250000))).toBe('1,3 mkr')
  })

  test('visar små belopp oförändrade', () => {
    expect(normalize(formatCompactCurrency(4500))).toBe('4 500 kr')
  })
})

describe('formatNumber', () => {
  test('grupperar tusental', () => {
    expect(normalize(formatNumber(264))).toBe('264')
    expect(normalize(formatNumber(12345))).toBe('12 345')
  })
})

describe('datum', () => {
  test('formaterar datum för inmatningsfält', () => {
    expect(toDateInputValue(new Date(2026, 8, 10))).toBe('2026-09-10')
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  test('visar kort veckodag i diagram', () => {
    expect(formatShortDay('2026-09-10')).toBe('tor 10/9')
  })
})

describe('formatDate, formatDateTime och formatTime', () => {
  const iso = new Date(2026, 8, 10, 14, 25).toISOString()

  test('visar datum enligt svensk standard', () => {
    expect(formatDate(iso)).toBe('2026-09-10')
  })

  test('visar datum och klockslag', () => {
    expect(formatDateTime(iso)).toBe('2026-09-10 14:25')
  })

  test('visar bara klockslag', () => {
    expect(formatTime(iso)).toBe('14:25')
  })
})

describe('formatRelative', () => {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

  test('säger nyss inom en minut', () => {
    expect(formatRelative(minutesAgo(0))).toBe('nyss')
  })

  test('räknar minuter och timmar', () => {
    expect(formatRelative(minutesAgo(5))).toBe('för 5 min sedan')
    expect(formatRelative(minutesAgo(120))).toBe('för 2 tim sedan')
  })

  test('säger igår för ett dygn sedan', () => {
    expect(formatRelative(minutesAgo(60 * 25))).toBe('igår')
  })

  test('går över till datum efter en månad', () => {
    expect(formatRelative(minutesAgo(60 * 24 * 40))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatPercent och formatCurrencyExact', () => {
  test('visar procent med svenskt decimaltecken', () => {
    expect(formatPercent(35)).toBe('35 %')
    expect(formatPercent(33.333, 1)).toBe('33,3 %')
  })

  test('visar exakta belopp med två decimaler', () => {
    expect(normalize(formatCurrencyExact(1990.5))).toBe('1 990,50 kr')
  })
})

describe('plural', () => {
  test('använder singular vid exakt ett', () => {
    expect(plural(1, 'artikel', 'artiklar')).toBe('1 artikel')
  })

  test('använder plural vid noll och flera', () => {
    expect(plural(0, 'artikel', 'artiklar')).toBe('0 artiklar')
    expect(normalize(plural(1200, 'artikel', 'artiklar'))).toBe('1 200 artiklar')
  })
})
