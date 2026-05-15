import { describe, it, expect } from 'vitest'
import { findLineForHeadingText, getScrollFraction, computePreviewScrollTarget, PREVIEW_SCROLL_OFFSET_PX } from '../scroll-sync.js'

describe('scroll-sync', () => {
  it('findLineForHeadingText matches case-insensitively normalized', () => {
    const md = '#  Hello  World  \n'
    expect(findLineForHeadingText(md, 'Hello World')).toBe(1)
    expect(findLineForHeadingText(md, 'Nope')).toBeNull()
  })

  it('getScrollFraction returns 0..1', () => {
    const scroller = {
      scrollTop: 50,
      clientHeight: 100,
      scrollHeight: 200
    }
    expect(getScrollFraction(/** @type {any} */ (scroller))).toBe(0.5)
  })

  it('computePreviewScrollTarget falls back to scroll ratio with no [data-line]', () => {
    const container = {
      querySelectorAll: () => /** @type {any} */ ([]),
      scrollHeight: 300,
      clientHeight: 100,
      scrollTop: 0
    }
    expect(computePreviewScrollTarget(0, /** @type {any} */ (container), 0.5)).toBe(100)
  })

  it('PREVIEW_SCROLL_OFFSET_PX is a tunable number (may be negative for upward nudge)', () => {
    expect(typeof PREVIEW_SCROLL_OFFSET_PX).toBe('number')
    expect(Number.isFinite(PREVIEW_SCROLL_OFFSET_PX)).toBe(true)
  })

  it('computePreviewScrollTarget subtracts PREVIEW_SCROLL_OFFSET_PX from marker target', () => {
    const OriginalElement = globalThis.Element
    class FakeElement {
      constructor() {
        /** @type {Map<string, string>} */
        this.attrs = new Map()
      }
      setAttribute(name, value) {
        this.attrs.set(String(name), String(value))
      }
      getAttribute(name) {
        return this.attrs.get(String(name)) ?? null
      }
      getBoundingClientRect() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
      }
    }
    globalThis.Element = /** @type {any} */ (FakeElement)

    const marker = new FakeElement()
    marker.setAttribute('data-line', '20')
    marker.getBoundingClientRect = () => ({ top: 300, left: 0, right: 0, bottom: 0, width: 0, height: 0 })

    const container = {
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTop: 0,
      querySelectorAll: () => /** @type {any} */ ([marker]),
      contains: (el) => el === marker,
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
    }

    try {
      expect(computePreviewScrollTarget(20, /** @type {any} */ (container), 0.2)).toBe(300 - PREVIEW_SCROLL_OFFSET_PX)
    } finally {
      globalThis.Element = OriginalElement
    }
  })

  it('computePreviewScrollTarget clamps to bottom near editor bottom', () => {
    const container = {
      querySelectorAll: () => /** @type {any} */ ([]),
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTop: 0
    }
    expect(computePreviewScrollTarget(999, /** @type {any} */ (container), 0.997)).toBe(600)
  })
})
