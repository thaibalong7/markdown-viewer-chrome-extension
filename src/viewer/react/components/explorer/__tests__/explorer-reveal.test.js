import { describe, expect, it } from 'vitest'
import { getExplorerRevealScrollDelta } from '../explorer-reveal.js'

describe('getExplorerRevealScrollDelta', () => {
  it('does nothing when the active row is below the sticky header', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 172, bottom: 204 },
      scrollRect: { top: 0, bottom: 400 },
      stickyHeaderRect: { bottom: 140 }
    })).toBe(0)
  })

  it('scrolls upward when the active row is hidden behind the sticky header', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 128, bottom: 160 },
      scrollRect: { top: 0, bottom: 400 },
      stickyHeaderRect: { bottom: 150 },
      topGap: 8
    })).toBe(-30)
  })

  it('places revealed rows below the sticky header by default', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 128, bottom: 160 },
      scrollRect: { top: 0, bottom: 400 },
      stickyHeaderRect: { bottom: 150 }
    })).toBe(-54)
  })

  it('scrolls downward when the active row is below the visible area', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 378, bottom: 410 },
      scrollRect: { top: 0, bottom: 400 },
      stickyHeaderRect: { bottom: 150 }
    })).toBe(42)
  })

  it('allows callers to use a smaller bottom visibility gap', () => {
    expect(getExplorerRevealScrollDelta({
      rowRect: { top: 378, bottom: 410 },
      scrollRect: { top: 0, bottom: 400 },
      stickyHeaderRect: { bottom: 150 },
      bottomGap: 4
    })).toBe(14)
  })
})
