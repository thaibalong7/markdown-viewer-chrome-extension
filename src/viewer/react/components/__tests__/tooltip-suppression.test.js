import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Tooltip } from '../Tooltip.jsx'

// Persist hook state between renders without requiring a browser DOM.
const hooks = vi.hoisted(() => ({ slots: [], cursor: 0, effects: [] }))
vi.mock('react', async original => ({
  ...await original(),
  useRef: initial => {
    const index = hooks.cursor++
    return hooks.slots[index] ??= { current: initial }
  },
  useState: initial => {
    const index = hooks.cursor++
    if (!(index in hooks.slots)) hooks.slots[index] = initial
    return [hooks.slots[index], value => { hooks.slots[index] = value }]
  },
  useCallback: callback => callback,
  useLayoutEffect: () => {},
  useEffect: effect => { hooks.effects.push(effect) }
}))
vi.mock('react-dom', () => ({ createPortal: node => node }))

const child = React.createElement('button', { 'aria-label': 'Update document' })
const event = { defaultPrevented: false }

function render(suppressed = false) {
  hooks.cursor = 0
  hooks.effects = []
  return Tooltip({ content: 'Update document', showDelayMs: 100, suppressed, children: child })
}

function flushEffects() {
  hooks.effects.forEach(effect => effect())
}

function anchor(tree) { return tree.props.children[0] }
function tip(tree) { return tree.props.children[1] }

beforeEach(() => {
  vi.useFakeTimers()
  hooks.slots = []
  vi.stubGlobal('window', {
    setTimeout, clearTimeout,
    addEventListener: vi.fn(), removeEventListener: vi.fn()
  })
  vi.stubGlobal('ShadowRoot', class {})
  anchor(render()).props.ref({ ownerDocument: { body: {} } })
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it.each(['onPointerEnter', 'onFocus'])('blocks %s while suppressed, then restores normal tooltips', handler => {
  const hidden = render(true)
  flushEffects()
  anchor(hidden).props[handler](event)
  vi.advanceTimersByTime(100)
  expect(tip(render(true))).toBeNull()
  expect(vi.getTimerCount()).toBe(0)

  const restored = render()
  anchor(restored).props[handler](event)
  vi.advanceTimersByTime(100)
  expect(tip(render()).props.role).toBe('tooltip')
  expect(anchor(restored).type).toBe(anchor(hidden).type)
  expect(anchor(restored).props['aria-label']).toBe('Update document')
})

it('cancels a hover timer already pending when the notification appears', () => {
  anchor(render()).props.onPointerEnter(event)
  expect(vi.getTimerCount()).toBe(1)
  render(true)
  flushEffects()
  expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(100)
  expect(tip(render())).toBeNull()
})

it('hides an already-open tooltip immediately and keeps it closed after suppression ends', () => {
  anchor(render()).props.onFocus(event)
  vi.advanceTimersByTime(100)
  expect(tip(render()).props.role).toBe('tooltip')
  expect(tip(render(true))).toBeNull()
  flushEffects()
  expect(tip(render())).toBeNull()
})
