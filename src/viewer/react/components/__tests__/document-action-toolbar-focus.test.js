import { beforeEach, expect, it, vi } from 'vitest'
import { DocumentActionToolbar } from '../DocumentActionToolbar.jsx'

const hooks = vi.hoisted(() => ({ refs: [], effect: null }))
vi.mock('react', async original => ({
  ...await original(),
  useRef: value => { const ref = { current: value }; hooks.refs.push(ref); return ref },
  useLayoutEffect: effect => { hooks.effect = effect }
}))
vi.mock('../../hooks/useDocumentActionsLayout.js', () => ({
  useDocumentActionsLayout: () => ({ availableSize: 200, controlSize: 28, vertical: false })
}))

beforeEach(() => { hooks.refs = []; hooks.effect = null })

function mount(activeKind) {
  const onMenuChange = vi.fn()
  const onLayoutChange = vi.fn()
  const tree = DocumentActionToolbar({ actions: [], visible: true, onMenuChange, onLayoutChange })
  const focus = vi.fn()
  const trigger = { focus }
  const body = {}
  const menu = {}
  const active = activeKind === 'body' ? body : {
    closest: selector => selector === '[role="menu"]' ? menu : { querySelector: () => trigger }
  }
  const root = {
    ownerDocument: { activeElement: active, body },
    contains: () => activeKind === 'menu',
    querySelector: selector => selector.includes('"copy"') ? null : trigger
  }
  hooks.refs[0].current = root
  tree.props.onFocusCapture({ target: { closest: () => ({ dataset: { mdpAction: 'copy' } }) } })
  hooks.effect()
  return { focus, onMenuChange, onLayoutChange }
}

it('closes popovers on layout changes and keeps menu focus on the surviving trigger', () => {
  const m = mount('menu')
  expect(m.onMenuChange).toHaveBeenCalledWith(null)
  expect(m.onLayoutChange).toHaveBeenCalledWith(':false:28:200')
  expect(m.focus).toHaveBeenCalledWith({ preventScroll: true })
})

it('moves lost focus to More when the previously focused command overflows', () => {
  expect(mount('body').focus).toHaveBeenCalledWith({ preventScroll: true })
})

it('does not move focus away from an unrelated modal or control', () => {
  expect(mount('dialog').focus).not.toHaveBeenCalled()
})
