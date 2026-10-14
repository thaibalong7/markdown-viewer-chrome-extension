import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getDefaultImageResolution,
  getNextResolution,
  getMaxImageResolution,
  getRasterDimensions
} from '../media/resolution-model.js'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('explicit render pixel dimensions', () => {
  it.each([1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 4, 5, 8])('allocates actual bitmap pixels at ×%s, independent of zoom', (resolution) => {
    expect(getRasterDimensions({ width: 600, height: 400, resolution })).toEqual({ width: 600 * resolution, height: 400 * resolution })
  })
  it('uses Mermaid logical dimensions without conflating its 2× baseline and resolution', () => {
    const logical = { width: 1200, height: 800, baseResolution: 2 }
    expect(getRasterDimensions({ ...logical, resolution: 1 })).toEqual({ width: 600, height: 400 })
    expect(getRasterDimensions({ ...logical, resolution: 4 })).toEqual({ width: 2400, height: 1600 })
  })
  it.each([
    { width: Infinity, height: 400, resolution: 1 },
    { width: 0, height: 400, resolution: 1 },
    { width: 600, height: 400, resolution: 0 },
    { width: 16385, height: 100, resolution: 1 },
    { width: 16384, height: 2049, resolution: 1 },
    { width: 6000, height: 6000, resolution: 1 },
    { width: 8193, height: 8193, resolution: 1 }
  ])('rejects allocations outside bounded canvas limits: %o', (options) => {
    expect(() => getRasterDimensions(options)).toThrow(/Bitmap limit/)
  })
  it('follows display pixel density for SVG defaults, bounded at 2×', () => {
    expect(getDefaultImageResolution(1)).toBe(1)
    expect(getDefaultImageResolution(1.25)).toBe(1.25)
    expect(getDefaultImageResolution(1.3)).toBe(1.5)
    expect(getDefaultImageResolution(1.5)).toBe(1.5)
    expect(getDefaultImageResolution(3)).toBe(2)
    expect(getDefaultImageResolution(NaN)).toBe(1)
  })
  it('changes by exactly 0.25 in both directions throughout the range and stops at its limits', () => {
    for (let current = 1; current < 8; current += 0.25) {
      expect(getNextResolution(current, 1)).toBe(current + 0.25)
      expect(getNextResolution(current + 0.25, -1)).toBe(current)
    }
    expect(getNextResolution(1, -1)).toBe(1)
    expect(getNextResolution(8, 1)).toBe(8)
  })
})

describe('image allocation limits', () => {
  it('allows larger bitmaps and accepts the exact side and area limits', () => {
    expect(getRasterDimensions({ width: 16384, height: 2048, resolution: 1 })).toEqual({ width: 16384, height: 2048 })
    expect(getRasterDimensions({ width: 2000, height: 1500, resolution: 3 })).toEqual({ width: 6000, height: 4500 })
  })
  it('calculates the last usable preset by area, by side, and by Mermaid baseline', () => {
    expect(getMaxImageResolution({ width: 2000, height: 1500 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 5000, height: 100 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 4000, height: 3000, baseResolution: 2 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 20000, height: 100 })).toBe(0)
  })
})
