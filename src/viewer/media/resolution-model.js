export const RESOLUTION_STEPS = Object.freeze(Array.from({ length: 29 }, (_, index) => 1 + index * 0.25))
const MAX_BITMAP_SIDE = 16384
const MAX_BITMAP_PIXELS = 32 * 1024 * 1024

export function getNextResolution(current, direction) {
  return direction > 0
    ? RESOLUTION_STEPS.find((step) => step > current + 0.0001) || RESOLUTION_STEPS.at(-1)
    : [...RESOLUTION_STEPS].reverse().find((step) => step < current - 0.0001) || RESOLUTION_STEPS[0]
}

export function getDefaultImageResolution(devicePixelRatio = 1) {
  const ratio = Math.min(2, Math.max(1, Number(devicePixelRatio) || 1))
  return RESOLUTION_STEPS.find((step) => step >= ratio)
}

export function getRasterDimensions({ width, height, resolution, baseResolution = 1 }) {
  const density = resolution / baseResolution
  const pixels = { width: Math.max(1, Math.round(width * density)), height: Math.max(1, Math.round(height * density)) }
  if (!Number.isFinite(density) || density <= 0 || !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 || pixels.width > MAX_BITMAP_SIDE || pixels.height > MAX_BITMAP_SIDE ||
      pixels.width * pixels.height > MAX_BITMAP_PIXELS) {
    throw new Error('Bitmap limit: 16,384 px per side or 32 Mi pixels total.')
  }
  return pixels
}

export function getMaxImageResolution(dimensions) {
  return [...RESOLUTION_STEPS].reverse().find((resolution) => {
    try {
      getRasterDimensions({ ...dimensions, resolution })
      return true
    } catch {
      return false
    }
  }) || 0
}
