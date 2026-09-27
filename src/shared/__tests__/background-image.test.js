import { describe, expect, it } from 'vitest'
import {
  imageBlobToDataUrl,
  isAnimatedImageBlob,
  parseThemeBackgroundDataUrl,
  validateThemeBackgroundFile
} from '../background-image.js'

describe('theme background image validation', () => {
  it('round-trips an allowed image blob through a data URL', async () => {
    const original = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
    const dataUrl = await imageBlobToDataUrl(original)
    const parsed = parseThemeBackgroundDataUrl(dataUrl)

    expect(dataUrl).toBe('data:image/png;base64,AQIDBA==')
    expect(parsed.type).toBe('image/png')
    expect(Array.from(new Uint8Array(await parsed.arrayBuffer()))).toEqual([1, 2, 3, 4])
  })

  it('rejects SVG, remote URLs, and empty images', () => {
    expect(() => validateThemeBackgroundFile({ type: 'image/svg+xml', size: 10 }))
      .toThrow('Use PNG, JPEG, WebP, AVIF, GIF, or APNG.')
    expect(() => parseThemeBackgroundDataUrl('https://example.com/background.jpg'))
      .toThrow('The theme background image data is invalid.')
    expect(() => validateThemeBackgroundFile({ type: 'image/png', size: 0 }))
      .toThrow('The image is empty.')
  })

  it('detects common animated image container markers', async () => {
    expect(await isAnimatedImageBlob(new Blob(['GIF89a'], { type: 'image/gif' }))).toBe(true)
    expect(await isAnimatedImageBlob(new Blob(['header-acTL-data'], { type: 'image/png' })))
      .toBe(true)
    expect(await isAnimatedImageBlob(new Blob(['RIFF-static'], { type: 'image/webp' })))
      .toBe(false)
  })
})
