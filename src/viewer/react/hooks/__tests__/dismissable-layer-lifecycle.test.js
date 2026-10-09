import { beforeEach, expect, it, vi } from 'vitest'
import { useDismissableLayer } from '../useDismissableLayer.js'

const effects = vi.hoisted(() => ({ cleanup: null }))
vi.mock('react', () => ({
  useEffect: effect => { effects.cleanup = effect() }
}))

function mount(dismissOnFocusOutside = true) {
  const root = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const layer = { getRootNode: () => root, ownerDocument: doc }
  const onDismiss = vi.fn()
  const focus = vi.fn()
  useDismissableLayer({
    open: true, layerRef: { current: layer }, onDismiss,
    restoreFocusRef: { current: { focus } }, preventEscapeDefault: true, dismissOnFocusOutside
  })
  const listener = (target, type) => target.addEventListener.mock.calls.find(call => call[0] === type)?.[1]
  return { root, doc, layer, onDismiss, focus, listener }
}
beforeEach(() => { effects.cleanup = null })

it('dismisses only outside focus and deduplicates a composed event across roots', () => {
  const m = mount()
  const inside = { composedPath: () => [m.layer] }
  m.listener(m.root, 'focusin')(inside)
  expect(m.onDismiss).not.toHaveBeenCalled()
  const outside = { composedPath: () => [{}] }
  m.listener(m.root, 'focusin')(outside)
  m.listener(m.doc, 'focusin')(outside)
  expect(m.onDismiss).toHaveBeenCalledOnce()
  expect(m.focus).not.toHaveBeenCalled()
})

it('restores focus on Escape and unregisters every installed listener', () => {
  const m = mount()
  const event = { key: 'Escape', preventDefault: vi.fn() }
  m.listener(m.root, 'keydown')(event)
  expect(event.preventDefault).toHaveBeenCalledOnce()
  expect(m.focus).toHaveBeenCalledOnce()
  effects.cleanup()
  for (const target of [m.root, m.doc]) {
    for (const [type, callback, capture] of target.addEventListener.mock.calls) {
      expect(target.removeEventListener).toHaveBeenCalledWith(type, callback, capture)
    }
  }
})

it('keeps focus-outside dismissal opt-in for existing menu consumers', () => {
  const m = mount(false)
  expect(m.listener(m.doc, 'focusin')).toBeUndefined()
  expect(m.listener(m.doc, 'pointerdown')).toBeTypeOf('function')
})
