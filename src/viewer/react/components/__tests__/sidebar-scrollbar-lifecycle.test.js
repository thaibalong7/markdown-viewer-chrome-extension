import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewerScrollbar } from '../ViewerScrollbar.jsx'

const hooks = vi.hoisted(() => ({ effects: [], state: 0, setters: [], refs: [] }))
vi.mock('react', async original => ({
  ...await original(),
  useCallback: callback => callback,
  useRef: value => { const ref = { current: value }; hooks.refs.push(ref); return ref },
  useState: () => {
    const setter = vi.fn(); hooks.setters.push(setter)
    const values = [{ visible: true, maxScrollTop: 1600, maxThumbOffset: 400, thumbHeight: 100, thumbOffset: 0 }, {}, true]
    return [values[hooks.state++], setter]
  },
  useEffect: effect => { hooks.effects.push(effect) }
}))
vi.mock('react-dom', () => ({ createPortal: vi.fn(element => element) }))

beforeEach(() => {
  vi.useFakeTimers()
  hooks.effects = []; hooks.state = 0; hooks.setters = []; hooks.refs = []
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 16))
  vi.stubGlobal('cancelAnimationFrame', id => clearTimeout(id))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function mount(visibility = 'auto') {
  const content = {}
  const listeners = {}
  const scrollElement = {
    clientHeight: 400, scrollHeight: 2000, scrollTop: 0,
    getBoundingClientRect: () => ({ top: 100, left: 100, right: 380 }),
    addEventListener: vi.fn((event, callback) => { listeners[event] = callback }),
    removeEventListener: vi.fn(), querySelectorAll: vi.fn(() => [content]), closest: () => ({})
  }
  const observer = { observe: vi.fn(), disconnect: vi.fn() }
  let onResize
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { onResize = callback; return observer } })
  const view = { innerWidth: 1200, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('window', view)
  const tree = ViewerScrollbar({ scrollElement, variant: 'sidebar', visibility,
    contentSelector: '.virtual-list', contentVersion: '100' })
  const cleanup = hooks.effects[0]()
  return { tree, scrollElement, observer, content, listeners, view, cleanup, resize: () => onResize() }
}

describe('shared ViewerScrollbar in sidebars', () => {
  it('reuses auto-hide and observes virtual-list size changes, cleaning up on collapse', () => {
    const m = mount()
    expect(m.observer.observe).toHaveBeenCalledWith(m.content)
    expect(m.scrollElement.querySelectorAll).toHaveBeenCalledWith('.virtual-list')
    expect(hooks.setters[1]).toHaveBeenLastCalledWith({ top: '102px', left: '372px', height: '396px' })
    m.listeners.scroll()
    vi.advanceTimersByTime(1000)
    expect(hooks.setters[2]).toHaveBeenLastCalledWith(false)
    m.resize()
    vi.advanceTimersByTime(16)
    m.cleanup()
    expect(m.observer.disconnect).toHaveBeenCalledOnce()
    expect(m.scrollElement.removeEventListener).toHaveBeenCalledWith('scroll', m.listeners.scroll)
    expect(m.view.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps always-visible and keyboard navigation behavior', () => {
    const m = mount('always')
    vi.advanceTimersByTime(5000)
    expect(hooks.setters[2]).not.toHaveBeenCalledWith(false)
    const event = { key: 'End', preventDefault: vi.fn() }
    m.tree.props.onKeyDown(event)
    expect(m.scrollElement.scrollTop).toBe(1600)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    m.cleanup()
  })

  it('retains dragging, track jumps and focus visibility from the document scrollbar', () => {
    const m = mount()
    const thumb = m.tree.props.children
    const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }
    const event = { currentTarget: target, pointerId: 2, button: 0, clientY: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    thumb.props.onPointerDown(event)
    thumb.props.onPointerMove({ ...event, clientY: 200 })
    expect(m.scrollElement.scrollTop).toBe(400)
    thumb.props.onPointerUp(event)
    expect(target.releasePointerCapture).toHaveBeenCalledWith(2)
    hooks.refs[0].current = { getBoundingClientRect: () => ({ top: 100 }) }
    m.tree.props.onPointerDown({ ...event, target, clientY: 350 })
    expect(m.scrollElement.scrollTop).toBe(800)
    m.tree.props.onFocus()
    vi.advanceTimersByTime(2000)
    expect(hooks.setters[2]).toHaveBeenLastCalledWith(true)
    m.cleanup()
  })
})
