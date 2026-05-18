import { describe, expect, it } from 'vitest'
import { getOutlineRevealAction } from '../outline-follow.js'

describe('getOutlineRevealAction', () => {
  it('does not reveal when the active row is comfortably visible', () => {
    expect(getOutlineRevealAction({
      activeIndex: 3,
      activeRow: { start: 160, end: 192 },
      scrollTop: 100,
      viewportHeight: 300,
      edgePadding: 48
    })).toBe('none')
  })

  it('centers when the active row is outside the rendered virtual range', () => {
    expect(getOutlineRevealAction({
      activeIndex: 12,
      activeRow: null,
      scrollTop: 100,
      viewportHeight: 300
    })).toBe('center')
  })

  it('centers when the active row is too close to the top or bottom edge', () => {
    expect(getOutlineRevealAction({
      activeIndex: 4,
      activeRow: { start: 112, end: 144 },
      scrollTop: 100,
      viewportHeight: 300,
      edgePadding: 48
    })).toBe('center')

    expect(getOutlineRevealAction({
      activeIndex: 9,
      activeRow: { start: 360, end: 392 },
      scrollTop: 100,
      viewportHeight: 300,
      edgePadding: 48
    })).toBe('center')
  })

  it('does nothing without a valid active index or viewport', () => {
    expect(getOutlineRevealAction({
      activeIndex: -1,
      activeRow: { start: 0, end: 32 },
      scrollTop: 0,
      viewportHeight: 300
    })).toBe('none')

    expect(getOutlineRevealAction({
      activeIndex: 1,
      activeRow: { start: 0, end: 32 },
      scrollTop: 0,
      viewportHeight: 0
    })).toBe('none')
  })
})
