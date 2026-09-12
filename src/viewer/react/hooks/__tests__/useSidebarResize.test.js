import { describe, expect, it } from 'vitest'
import { clampSidebarWidth } from '../useSidebarResize.js'

describe('clampSidebarWidth', () => {
  it('clamps both side panels to the supported width range', () => {
    expect(clampSidebarWidth(100)).toBe(220)
    expect(clampSidebarWidth(320.6)).toBe(321)
    expect(clampSidebarWidth(700)).toBe(520)
  })

  it('uses the minimum width for an invalid value', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(220)
  })
})
