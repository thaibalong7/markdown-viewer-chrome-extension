// Parse only literal sRGB colors. No CSS evaluation, named colors or document variables.
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/
// Consume CSS url() fragments without interpreting their IDs as colors.
const CANDIDATE = /url\([^()\r\n]*\)|#[\da-f]+|(?:rgba?|hsla?)\([^()\r\n]*\)/gi

function number(value) {
  return NUMBER.test(value) ? Number(value) : NaN
}

function channel(value, max) {
  const percent = value.endsWith('%')
  const n = number(percent ? value.slice(0, -1) : value)
  const limit = percent ? 100 : max
  return Number.isFinite(n) && n >= 0 && n <= limit ? n / limit * max : NaN
}

function hue(value) {
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)?$/i)
  if (!match) return NaN
  const factor = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 }[match[2]?.toLowerCase() || 'deg']
  const degrees = Number(match[1]) * factor
  return Number.isFinite(degrees) ? ((degrees % 360) + 360) % 360 : NaN
}

function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  return [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  })
}

export function parseColor(value) {
  const source = String(value).trim()
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(source)) {
    let hex = source.slice(1)
    if (hex.length <= 4) hex = [...hex].map(c => c + c).join('')
    const channels = hex.match(/../g).map(c => parseInt(c, 16))
    return { r: channels[0], g: channels[1], b: channels[2], a: (channels[3] ?? 255) / 255 }
  }
  const fn = source.match(/^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/i)
  if (!fn) return null
  const body = fn[2].trim()
  const legacy = body.includes(',')
  let parts
  let alpha
  if (legacy) {
    if (body.includes('/')) return null
    parts = body.split(',').map(part => part.trim())
    if (parts.length === 4) alpha = parts.pop()
  } else {
    const sections = body.split('/')
    if (sections.length > 2) return null
    parts = sections[0].trim().split(/\s+/)
    alpha = sections[1]?.trim()
  }
  if (parts.length !== 3) return null
  const a = alpha === undefined ? 1 : channel(alpha, 1)
  let rgb
  if (fn[1].toLowerCase().startsWith('rgb')) {
    if (legacy && !parts.every(part => part.endsWith('%') === parts[0].endsWith('%'))) return null
    rgb = parts.map(part => channel(part, 255))
  } else {
    if (!parts[1].endsWith('%') || !parts[2].endsWith('%')) return null
    const h = hue(parts[0])
    const s = channel(parts[1], 1)
    const l = channel(parts[2], 1)
    rgb = hslToRgb(h, s, l)
  }
  if (![...rgb, a].every(Number.isFinite)) return null
  return { r: rgb[0], g: rgb[1], b: rgb[2], a }
}

function rounded(value) {
  return Number(value.toFixed(6))
}

export function colorFormats({ r, g, b, a }) {
  const byte = n => Math.round(n).toString(16).padStart(2, '0').toUpperCase()
  const hex = `#${[r, g, b].map(byte).join('')}${a < 1 ? byte(a * 255) : ''}`
  const rgb = `${a < 1 ? 'rgba' : 'rgb'}(${[r, g, b].map(rounded).join(', ')}${a < 1 ? `, ${a}` : ''})`
  const channels = [r, g, b].map(n => n / 255)
  const max = Math.max(...channels)
  const min = Math.min(...channels)
  const delta = max - min
  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (delta) {
    if (max === channels[0]) h = ((channels[1] - channels[2]) / delta) % 6
    else if (max === channels[1]) h = (channels[2] - channels[0]) / delta + 2
    else h = (channels[0] - channels[1]) / delta + 4
    h = (h * 60 + 360) % 360
  }
  const hsl = `${a < 1 ? 'hsla' : 'hsl'}(${rounded(h)}, ${rounded(s * 100)}%, ${rounded(l * 100)}%${a < 1 ? `, ${a}` : ''})`
  return { HEX: hex, RGB: rgb, HSL: hsl }
}

export function findColors(text, { allowHex = false, limit = Infinity } = {}) {
  const matches = []
  if (limit <= 0) return matches
  for (const match of text.matchAll(CANDIDATE)) {
    const source = match[0]
    if (source.startsWith('#') && !allowHex) continue
    // Do not turn URL fragments, identifiers or parts of longer hex strings into colors.
    const before = text[match.index - 1] || ''
    const after = text[match.index + source.length] || ''
    if (/[\w#./?=&%\-]/.test(before) || /[\w\-]/.test(after)) continue
    const color = parseColor(source)
    if (color) matches.push({ index: match.index, source, color })
    if (matches.length >= limit) break
  }
  return matches
}
