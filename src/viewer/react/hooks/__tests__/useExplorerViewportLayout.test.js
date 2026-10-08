import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useExplorerViewportLayout } from '../explorer/useExplorerViewportLayout.js'

const harness = vi.hoisted(() => ({ effect: null, rowHeight: null }))
vi.mock('react', () => ({
  useLayoutEffect: effect => { harness.effect = effect },
  useState: initial => {
    harness.rowHeight = initial
    return [initial, value => { harness.rowHeight = value }]
  }
}))

beforeEach(() => { harness.effect = null; harness.rowHeight = null })

function mount() {
  const style = { setProperty: vi.fn(), removeProperty: vi.fn() }
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  let onResize
  const observer = { observe: vi.fn(), disconnect: vi.fn() }
  const view = {
    matchMedia: () => media,
    ResizeObserver: class { constructor(callback) { onResize = callback; return observer } }
  }
  const scrollElement = {
    offsetWidth: 240, clientWidth: 234,
    closest: vi.fn(() => ({ style })), ownerDocument: { defaultView: view }
  }
  useExplorerViewportLayout(scrollElement)
  const cleanup = harness.effect()
  return { scrollElement, style, media, observer, cleanup, resize: () => onResize() }
}

describe('Files viewport geometry', () => {
  it('measures the row viewport gutter without changing sidebar or card padding, preserving measurements while hidden', () => {
    const { scrollElement, style, resize, observer } = mount()
    expect(scrollElement.closest).toHaveBeenCalledWith('.mdp-explorer')
    expect(observer.observe).toHaveBeenCalledWith(scrollElement)
    expect(style.setProperty).toHaveBeenLastCalledWith('--mdp-explorer-scrollbar-width', '6px')
    scrollElement.clientWidth = 240
    resize()
    expect(style.setProperty).toHaveBeenLastCalledWith('--mdp-explorer-scrollbar-width', '0px')
    scrollElement.offsetWidth = 0
    const calls = style.setProperty.mock.calls.length
    resize()
    expect(style.setProperty).toHaveBeenCalledTimes(calls)
  })

  it('keeps virtual rows as tall as their pointer targets and releases all observers on teardown', () => {
    const { media, style, cleanup, observer } = mount()
    expect(harness.rowHeight).toBe(38)
    media.matches = true
    media.addEventListener.mock.calls[0][1]()
    expect(harness.rowHeight).toBe(44)
    media.matches = false
    media.addEventListener.mock.calls[0][1]()
    expect(harness.rowHeight).toBe(38)
    cleanup()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', media.addEventListener.mock.calls[0][1])
    expect(style.removeProperty).toHaveBeenCalledWith('--mdp-explorer-scrollbar-width')
  })
})
