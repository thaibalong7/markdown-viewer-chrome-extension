// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getSvgImageDimensions } from '../media/svg-image-dimensions.js'

const svg = attributes => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}></svg>`

describe('SVG zoom dimensions', () => {
  it('uses the landscape viewBox rather than treating 100% as 100 pixels', () => {
    expect(getSvgImageDimensions(svg('width="100%" viewBox="0 0 1280 690"'))).toEqual({ width: 1280, height: 690 })
  })

  it.each([
    ['viewBox="-10 -20 1280 690"', { width: 1280, height: 690 }],
    ['width="100%" height="100%" viewBox="0,0,1280,690"', { width: 1280, height: 690 }],
    ['width="680" height="570" viewBox="0 0 1280 690"', { width: 680, height: 570 }],
    ['width="1826px" height="1574px"', { width: 1826, height: 1574 }],
    ['width="2in" height="72pt"', { width: 192, height: 96 }],
    ['width="640" viewBox="0 0 1280 690"', { width: 640, height: 345 }],
    ['height="345" viewBox="0 0 1280 690"', { width: 640, height: 345 }],
    ['width="680" height="570" style="width: 100%; height: auto" viewBox="0 0 1280 690"', { width: 1280, height: 690 }],
    ['width="100%" style="width: 640px" viewBox="0 0 1280 690"', { width: 640, height: 345 }]
  ])('resolves supported dimensions: %s', (attributes, expected) => {
    expect(getSvgImageDimensions(svg(attributes))).toEqual(expected)
  })

  it.each([
    '', 'width="100%"', 'viewBox="0 0 0 690"', 'viewBox="0 0 1280 -690"',
    'viewBox="0 0 Infinity 690"', 'viewBox="0 0 1280"',
    'width="garbage" height="570"', 'width="1e999" height="570"'
  ])('returns no metadata dimensions when unavailable or invalid: %s', attributes => {
    expect(getSvgImageDimensions(svg(attributes))).toBeNull()
  })

  it('rejects malformed XML and non-SVG documents', () => {
    expect(getSvgImageDimensions('<svg')).toBeNull()
    expect(getSvgImageDimensions('<html width="1280" height="690"/>')).toBeNull()
    expect(getSvgImageDimensions('<svg width="1280" height="690"/>')).toBeNull()
  })
})
