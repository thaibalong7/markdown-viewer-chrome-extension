import { describe, expect, it } from 'vitest'
import { getRenderableImageDimensions } from '../image-lightbox.js'

describe('image lightbox', () => {
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
