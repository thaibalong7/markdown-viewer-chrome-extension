export const MAX_THEME_BACKGROUND_BYTES = 5 * 1024 * 1024
export const THEME_ASSET_ID_PATTERN = /^theme-asset:[a-z0-9][a-z0-9-]{7,127}$/

export const THEME_BACKGROUND_MIME_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/apng'
])

export function validateThemeBackgroundFile(file) {
  if (!file || typeof file !== 'object') throw new Error('Choose an image file.')
  if (!THEME_BACKGROUND_MIME_TYPES.includes(file.type)) {
    throw new Error('Use PNG, JPEG, WebP, AVIF, GIF, or APNG.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('The image is empty.')
  if (file.size > MAX_THEME_BACKGROUND_BYTES) {
    throw new Error('The background image must be 5 MiB or smaller.')
  }
  return file
}

export function parseThemeBackgroundDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!match || !THEME_BACKGROUND_MIME_TYPES.includes(match[1])) {
    throw new Error('The theme background image data is invalid.')
  }

  const binary = atob(match[2])
  if (binary.length <= 0 || binary.length > MAX_THEME_BACKGROUND_BYTES) {
    throw new Error('The background image must be 5 MiB or smaller.')
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: match[1] })
}

export async function imageBlobToDataUrl(blob) {
  validateThemeBackgroundFile(blob)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return `data:${blob.type};base64,${btoa(binary)}`
}

function containsAscii(bytes, token) {
  const needle = Array.from(token, (character) => character.charCodeAt(0))
  outer: for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (bytes[index + offset] !== needle[offset]) continue outer
    }
    return true
  }
  return false
}

export async function isAnimatedImageBlob(blob) {
  if (blob.type === 'image/gif' || blob.type === 'image/apng') return true
  if (!['image/png', 'image/webp', 'image/avif'].includes(blob.type)) return false
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (blob.type === 'image/png') return containsAscii(bytes, 'acTL')
  if (blob.type === 'image/webp') return containsAscii(bytes, 'ANIM')
  return containsAscii(bytes, 'avis')
}

export function readImageFileAsDataUrl(file) {
  validateThemeBackgroundFile(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Could not read the image.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}
