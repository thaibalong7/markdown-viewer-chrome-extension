import { describe, expect, it } from 'vitest'
import { canAdjustImageResolution, getRenderableImageDimensions } from '../image-lightbox.js'

describe('image lightbox', () => {
  it('uses registry capabilities for workspace images rather than their blob URL', () => {
    expect(canAdjustImageResolution({ src: 'blob:svg', getAttribute: () => 'svg-image' })).toBe(true)
    expect(canAdjustImageResolution({ src: 'blob:png', getAttribute: () => 'raster-image' })).toBe(false)
    expect(canAdjustImageResolution({ src: 'blob:unknown' })).toBe(false)
  })

  it.each([
    ['file:///docs/diagram.SVG?version=2#icon', true],
    ['https://example.com/my%20chart.svg', true],
    ['data:image/svg+xml;charset=utf-8,%3Csvg%3E', true],
    ['file:///docs/diagram.png', false],
    ['data:image/png;base64,abc', false],
    ['not a URL', false]
  ])('classifies embedded image %s for resolution controls', (src, expected) => {
    expect(canAdjustImageResolution({ src })).toBe(expected)
  })
  it('accepts a fully loaded image with intrinsic dimensions', () => {
    expect(
      getRenderableImageDimensions({ complete: true, naturalWidth: 1200, naturalHeight: 800 })
    ).toEqual({ width: 1200, height: 800 })
  })

  it.each([
    { complete: false, naturalWidth: 1200, naturalHeight: 800 },
    { complete: true, naturalWidth: 0, naturalHeight: 0 },
    { complete: true, naturalWidth: 1200, naturalHeight: 0 }
  ])('rejects images that cannot be rendered: %o', (image) => {
    expect(getRenderableImageDimensions(image)).toBeNull()
  })
})
