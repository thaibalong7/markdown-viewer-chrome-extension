import { describe, expect, it, vi } from 'vitest'
import { getExplorerRowMenuStyle, useExplorerRowMenuLayout } from '../useExplorerRowMenuLayout.js'

const hooks = vi.hoisted(() => ({ effect: null, setStyle: vi.fn() }))
vi.mock('react', async original => ({
  ...await original(), useState: () => [undefined, hooks.setStyle],
  useLayoutEffect: effect => { hooks.effect = effect }
}))

describe('Files row menu viewport bounds', () => {
  const viewport = { top: 100, bottom: 500, left: 0, right: 280 }
  it('opens below when there is room and above a bottom row', () => {
    expect(getExplorerRowMenuStyle({ top: 120, bottom: 148 }, viewport, 116).top).toBe('32px')
    expect(getExplorerRowMenuStyle({ top: 460, bottom: 488 }, viewport, 116).top).toBe('-120px')
  })
  it('clamps tall menus to the scroll viewport and limits width for narrow sidebars', () => {
    const style = getExplorerRowMenuStyle({ top: 110, bottom: 154 },
      { ...viewport, bottom: 200, right: 160 }, 300)
    expect(style.top).toBe('-6px')
    expect(style.maxHeight).toBe('92px')
    expect(style.maxWidth).toBe('144px')
    expect(style.overflowY).toBe('auto')
  })

  it('measures on open and removes scroll/resize dismissal listeners on close or unmount', () => {
    const onClose = vi.fn()
    const view = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    const scroll = { addEventListener: vi.fn(), removeEventListener: vi.fn(),
      getBoundingClientRect: () => viewport }
    const layerRef = { current: { closest: () => scroll, querySelector: () => ({ scrollHeight: 116 }),
      ownerDocument: { defaultView: view }, getBoundingClientRect: () => ({ top: 460, bottom: 488 }) } }
    useExplorerRowMenuLayout({ open: true, layerRef, onClose })
    const cleanup = hooks.effect()
    expect(hooks.setStyle).toHaveBeenCalledWith(expect.objectContaining({ top: '-120px' }))
    expect(scroll.addEventListener).toHaveBeenCalledWith('scroll', onClose)
    expect(view.addEventListener).toHaveBeenCalledWith('resize', onClose)
    cleanup()
    expect(scroll.removeEventListener).toHaveBeenCalledWith('scroll', onClose)
    expect(view.removeEventListener).toHaveBeenCalledWith('resize', onClose)
    scroll.addEventListener.mockClear()
    useExplorerRowMenuLayout({ open: false, layerRef, onClose })
    expect(hooks.effect()).toBeUndefined()
    expect(scroll.addEventListener).not.toHaveBeenCalled()
  })
})
