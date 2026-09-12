/**
 * Genererar programikonerna utan externa beroenden:
 *   build/icon.ico  — används av Windows-installeraren och genvägarna
 *   build/icon.png  — används av macOS/Linux-bygget
 *
 * Ikonen ritas som RGBA-pixlar, kodas till PNG och packas i ett ICO-omslag.
 * Vill du ha en egen ikon: ersätt filerna i build/ med dina egna.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICO_SIZE = 256
const PNG_SIZE = 512
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
]
const BG = hex('#12161C')
const RING = hex('#FF8A1F')
const HUB = hex('#0B0D10')
const SPOKE = hex('#39424E')

/** Ritar hjulmärket i angiven storlek och returnerar en färdig PNG-buffert. */
function renderPng(size) {
  const scale = size / 256
  const pixels = Buffer.alloc(size * size * 4)
  const center = (size - 1) / 2

  const put = (x, y, [r, g, b], alpha) => {
    if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return
    const i = (y * size + x) * 4
    const dst = pixels[i + 3] / 255
    const out = alpha + dst * (1 - alpha)
    if (out <= 0) return
    pixels[i] = Math.round((r * alpha + pixels[i] * dst * (1 - alpha)) / out)
    pixels[i + 1] = Math.round((g * alpha + pixels[i + 1] * dst * (1 - alpha)) / out)
    pixels[i + 2] = Math.round((b * alpha + pixels[i + 2] * dst * (1 - alpha)) / out)
    pixels[i + 3] = Math.round(out * 255)
  }

  // Rundad bakgrundsruta med mjuk kant
  const half = size / 2 - 4 * scale
  const corner = 52 * scale
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - center) - (half - corner)
      const dy = Math.abs(y - center) - (half - corner)
      const distance =
        dx <= 0 && dy <= 0
          ? Math.max(dx, dy)
          : Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - corner
      put(x, y, BG, Math.min(1, Math.max(0, 0.5 - distance)))
    }
  }

  // Däckring och nav
  const ringOuter = 96 * scale
  const ringInner = 66 * scale
  const hubRadius = 34 * scale
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center)
      const ring = Math.min(
        Math.max(0, Math.min(1, 0.5 + (ringOuter - distance))),
        Math.max(0, Math.min(1, 0.5 + (distance - ringInner)))
      )
      put(x, y, RING, ring)
      put(x, y, HUB, Math.max(0, Math.min(1, 0.5 + (hubRadius - distance))))
    }
  }

  // Ekrar
  const spokeWidth = 4 * scale
  for (let spoke = 0; spoke < 5; spoke++) {
    const angle = (spoke / 5) * Math.PI * 2 - Math.PI / 2
    for (let t = hubRadius - 2 * scale; t < ringInner + 2 * scale; t += 0.25) {
      for (let w = -spokeWidth; w <= spokeWidth; w += 0.4) {
        put(
          Math.round(center + Math.cos(angle) * t - Math.sin(angle) * w),
          Math.round(center + Math.sin(angle) * t + Math.cos(angle) * w),
          SPOKE,
          0.9
        )
      }
    }
  }

  return encodePng(pixels, size)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (buffer) => {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(pixels, size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    pixels.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Packar en PNG i ett ICO-omslag (stöds av Windows Vista och senare). */
function wrapInIco(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 0 // 0 betyder 256 px
  entry[1] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png])
}

mkdirSync(join(root, 'build'), { recursive: true })
writeFileSync(join(root, 'build', 'icon.ico'), wrapInIco(renderPng(ICO_SIZE)))
writeFileSync(join(root, 'build', 'icon.png'), renderPng(PNG_SIZE))
console.log(`[generate-icon] build/icon.ico (${ICO_SIZE}px) och build/icon.png (${PNG_SIZE}px) skapade`)
