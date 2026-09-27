import { describe, expect, it } from 'vitest'
import {
  getScrollTopForThumbOffset,
  getViewerScrollbarMetrics
} from '../ViewerScrollbar.jsx'
import {
  normalizeScrollbarVisibility,
  SCROLLBAR_VISIBILITY
} from '../../../../shared/constants/scrollbar.js'

describe('ViewerScrollbar metrics', () => {
  it('stays hidden when the document does not overflow', () => {
    expect(getViewerScrollbarMetrics({
      scrollTop: 0,
      scrollHeight: 800,
      clientHeight: 800,
      trackHeight: 796
    }).visible).toBe(false)
  })

  it('keeps a visible minimum thumb and maps document progress to the track', () => {
    const metrics = getViewerScrollbarMetrics({
      scrollTop: 600,
      scrollHeight: 2400,
      clientHeight: 800,
      trackHeight: 796
    })

    expect(metrics.visible).toBe(true)
    expect(metrics.thumbHeight).toBeCloseTo(265.333, 2)
    expect(metrics.thumbOffset).toBeCloseTo(metrics.maxThumbOffset * 0.375, 4)
  })

  it('converts and clamps thumb movement back to scrollTop', () => {
    expect(getScrollTopForThumbOffset({
      thumbOffset: 200,
      maxThumbOffset: 400,
      maxScrollTop: 1600
    })).toBe(800)
    expect(getScrollTopForThumbOffset({
      thumbOffset: 999,
      maxThumbOffset: 400,
      maxScrollTop: 1600
    })).toBe(1600)
  })

  it('uses auto-hide as the safe fallback for unknown visibility values', () => {
    expect(normalizeScrollbarVisibility(SCROLLBAR_VISIBILITY.ALWAYS)).toBe('always')
    expect(normalizeScrollbarVisibility('unknown')).toBe('auto')
    expect(normalizeScrollbarVisibility(undefined)).toBe('auto')
  })
})
