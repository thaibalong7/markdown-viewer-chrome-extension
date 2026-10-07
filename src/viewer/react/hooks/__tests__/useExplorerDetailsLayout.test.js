import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useExplorerDetailsLayout } from '../explorer/useExplorerDetailsLayout.js'

const harness = vi.hoisted(() => ({ effect: null, state: null }))
vi.mock('react', () => ({
  useEffect: effect => { harness.effect = effect },
  useState: initial => {
    harness.state = initial
    return [initial, update => { harness.state = update(harness.state) }]
  }
}))

beforeEach(() => { harness.effect = null; harness.state = null })

function mount({ width = 240, badgeWidth = 60, scrollWidth = 58, coarse = false } = {}) {
  const media = { matches: coarse, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  let onResize
  const observer = { observe: vi.fn(), disconnect: vi.fn() }
  const view = {
    matchMedia: () => media,
    ResizeObserver: class { constructor(callback) { onResize = callback; return observer } }
  }
  const summary = { ownerDocument: { defaultView: view }, getBoundingClientRect: () => ({ width }) }
  const badge = { scrollWidth, getBoundingClientRect: () => ({ width: badgeWidth }) }
  useExplorerDetailsLayout({ current: summary }, { current: badge })
  const cleanup = harness.effect()
  return { media, observer, cleanup, summary, badge, resize: () => onResize() }
}

describe('Files details measurements', () => {
  it('observes the status row and badge, including intrinsic width when the badge is truncated', () => {
    const { observer, summary, badge } = mount({ badgeWidth: 54, scrollWidth: 78 })
    expect(observer.observe.mock.calls).toEqual([[summary], [badge]])
    expect(harness.state).toEqual({ width: 240, badgeWidth: 80, coarse: false })
  })

  it('updates pointer density, retains useful widths while the rail is hidden, and releases listeners', () => {
    const { media, summary, resize, cleanup, observer } = mount()
    media.matches = true
    media.addEventListener.mock.calls[0][1]()
    expect(harness.state.coarse).toBe(true)
    summary.getBoundingClientRect = () => ({ width: 0 })
    resize()
    expect(harness.state.width).toBe(240)
    cleanup()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', media.addEventListener.mock.calls[0][1])
  })

  it('responds to sidebar resizing without replacing an unchanged measurement', () => {
    const { summary, resize } = mount()
    const previous = harness.state
    resize()
    expect(harness.state).toBe(previous)
    summary.getBoundingClientRect = () => ({ width: 180 })
    resize()
    expect(harness.state.width).toBe(180)
  })
})
