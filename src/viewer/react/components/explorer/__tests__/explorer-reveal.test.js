import { describe, expect, it } from 'vitest'
import { getExplorerRevealScrollDelta } from '../explorer-reveal.js'

describe('getExplorerRevealScrollDelta', () => {
  it('does nothing when the active row is inside the scroll viewport', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 172, bottom: 204 },
      scrollRect: { top: 140, bottom: 400 }
    })).toBe(0)
  })

  it('scrolls upward when the active row is above the scroll viewport', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 128, bottom: 160 },
      scrollRect: { top: 150, bottom: 400 },
      topGap: 8
    })).toBe(-30)
  })

  it('places revealed rows below the scroll viewport edge by default', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 128, bottom: 160 },
      scrollRect: { top: 150, bottom: 400 }
    })).toBe(-54)
  })

  it('scrolls downward when the active row is below the visible area', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 378, bottom: 410 },
      scrollRect: { top: 150, bottom: 400 }
    })).toBe(42)
  })

  it('allows callers to use a smaller bottom visibility gap', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 378, bottom: 410 },
      scrollRect: { top: 0, bottom: 400 },
      bottomGap: 4
    })).toBe(14)
  })
})
