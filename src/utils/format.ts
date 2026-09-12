const CURRENCY_FALLBACK = 'SEK'

const numberFormat = new Intl.NumberFormat('sv-SE')
const decimalFormat = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Priser visas utan ören — svensk däckhandel prissätter i hela kronor. */
export function formatCurrency(value: number, currency = CURRENCY_FALLBACK): string {
  const rounded = Math.round(value)
  return `${numberFormat.format(rounded)} ${currencySymbol(currency)}`
}

export function formatCurrencyExact(value: number, currency = CURRENCY_FALLBACK): string {
  return `${decimalFormat.format(value)} ${currencySymbol(currency)}`
}

/** Stora belopp kortas till "1,2 mkr" / "84 tkr" i nyckeltalskort. */
export function formatCompactCurrency(value: number, currency = CURRENCY_FALLBACK): string {
  const symbol = currencySymbol(currency)
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} m${symbol}`
  if (absolute >= 10_000) return `${Math.round(value / 1000)} t${symbol}`
  return `${numberFormat.format(Math.round(value))} ${symbol}`
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'SEK':
      return 'kr'
    case 'EUR':
      return '€'
    case 'USD':
      return '$'
    case 'NOK':
      return 'nkr'
    case 'DKK':
      return 'dkk'
    default:
      return currency
  }
}

/** Svensk pluralform: "1 artikel" men "2 artiklar". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals).replace('.', ',')} %`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE')
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString('sv-SE')} ${date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör']

export function formatShortDay(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
}

/** Relativ tid på svenska: "för 5 min sedan", "igår". */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'nyss'
  if (minutes < 60) return `för ${minutes} min sedan`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `för ${hours} tim sedan`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'igår'
  if (days < 30) return `för ${days} dagar sedan`
  return formatDate(iso)
}

export function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
