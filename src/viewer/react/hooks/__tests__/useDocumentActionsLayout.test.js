import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentActionsLayout } from '../useDocumentActionsLayout.js'

const mocks = vi.hoisted(() => ({ setMetrics: vi.fn(), cleanup: null }))
vi.mock('react', () => ({
  useState: initial => [initial, mocks.setMetrics],
  useLayoutEffect: effect => { mocks.cleanup = effect() }
}))

function mount() {
  const bound = { clientWidth: 224, clientHeight: 400 }
  const style = { flexDirection: 'row', getPropertyValue: name => name === '--mdp-action-size' ? '28' : '' }
  const media = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  let resize
  const observer = { observe: vi.fn(), disconnect: vi.fn() }
  const view = {
    getComputedStyle: node => node === bound
      ? { paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px' } : style,
    matchMedia: () => media,
    ResizeObserver: class { constructor(callback) { resize = callback; return observer } },
    addEventListener: vi.fn(), removeEventListener: vi.fn()
  }
  const toolbar = { parentElement: bound, ownerDocument: { defaultView: view } }
  useDocumentActionsLayout({ current: toolbar })
  const latest = () => mocks.setMetrics.mock.calls.at(-1)[0]({})
  return { bound, style, media, observer, view, resize, latest }
}
beforeEach(() => { mocks.setMetrics.mockClear() })

describe('document action layout measurement', () => {
  it('measures allocated width minus insets, not the width of rendered commands', () => {
    const m = mount()
    expect(m.latest()).toEqual({ availableSize: 200, controlSize: 28, dividerSize: 8, vertical: false })
    expect(m.observer.observe).toHaveBeenCalledWith(m.bound)
    m.bound.clientWidth = 280
    m.resize()
    expect(m.latest().availableSize).toBe(256)
  })
  it('uses available height in the vertical rail and responds to coarse pointer changes', () => {
    const m = mount()
    m.style.flexDirection = 'column'
    m.style.getPropertyValue = name => name === '--mdp-action-size' ? '44' : '21'
    m.resize()
    expect(m.latest()).toEqual({ availableSize: 392, controlSize: 44, dividerSize: 21, vertical: true })
    expect(m.media.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
  it('ignores hidden measurements, avoids redundant renders and removes observers/listeners', () => {
    const m = mount()
    const current = m.latest()
    expect(mocks.setMetrics.mock.calls.at(-1)[0](current)).toBe(current)
    const count = mocks.setMetrics.mock.calls.length
    m.bound.clientWidth = 0
    m.resize()
    expect(mocks.setMetrics).toHaveBeenCalledTimes(count)
    mocks.cleanup()
    expect(m.observer.disconnect).toHaveBeenCalledOnce()
    expect(m.media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(m.view.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
