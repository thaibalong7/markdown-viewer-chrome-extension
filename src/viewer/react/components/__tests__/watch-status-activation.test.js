import React from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { WatchStatus } from '../WatchStatus.jsx'
import { Tooltip } from '../Tooltip.jsx'

const mocks = vi.hoisted(() => ({ start: vi.fn(), phase: null }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
  useEffect: () => {},
  useCallback: (callback) => callback,
  useRef: (current) => ({ current }),
  useId: () => 'watch-test'
}))
vi.mock('../../hooks/useWatchUpdateFeedback.js', () => ({ useWatchUpdateFeedback: () => ({ phase: mocks.phase, start: mocks.start }) }))

function find(element, className) {
  if (!React.isValidElement(element)) return undefined
  if (element.props.className?.split(' ').includes(className)) return element
  for (const child of React.Children.toArray(element.props.children)) {
    const found = find(child, className)
    if (found) return found
  }
}

function findTooltip(tree) {
  const wrapper = React.Children.toArray(tree.props.children)[0]
  return React.Children.toArray(wrapper.props.children).find(child => child.type === Tooltip)
}

beforeEach(() => { vi.clearAllMocks(); mocks.phase = null })

it('suppresses only the trigger tooltip while the new-version notice is visible', () => {
  const state = { available: true, supported: true, pending: true, mode: 'ask' }
  const pending = WatchStatus({ state })
  expect(find(pending, 'mdp-watch-status__notice')).toBeDefined()
  expect(findTooltip(pending).props.suppressed).toBe(true)
  expect(findTooltip(pending).props.content).toBe('Update document')
  for (const props of [{ state: { ...state, pending: false } }, { state, disabled: true }]) {
    const tree = WatchStatus(props)
    expect(find(tree, 'mdp-watch-status__notice')).toBeUndefined()
    expect(findTooltip(tree).props.suppressed).toBe(false)
  }
})

it.each(['mdp-watch-status__trigger', 'mdp-watch-status__notice'])(
  'animates %s and applies a manual pending update immediately', (className) => {
    const onApply = vi.fn(() => new Promise(() => {}))
    const tree = WatchStatus({ state: { available: true, supported: true, pending: true, mode: 'ask' }, onApply })
    find(tree, className).props.onClick()
    expect(mocks.start).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledExactlyOnceWith(undefined)
  }
)

it('keeps idle, protected-editor and automatic triggers out of manual click feedback', () => {
  const onApply = vi.fn()
  for (const props of [
    { state: { available: true, supported: true, mode: 'ask' } },
    { state: { available: true, supported: true, pending: true, mode: 'ask' }, isEditMode: true },
    { state: { available: true, supported: true, pending: true, deferred: true, mode: 'auto' } }
  ]) {
    find(WatchStatus({ ...props, onApply }), 'mdp-watch-status__trigger').props.onClick()
  }
  expect(mocks.start).not.toHaveBeenCalled()
  expect(onApply).toHaveBeenCalledOnce()
})

it('holds the busy glyph after disk loading ends, then exposes a distinct success label', () => {
  const state = { available: true, supported: true, pending: false, manualChecking: false, mode: 'ask' }
  mocks.phase = 'busy'
  let trigger = find(WatchStatus({ state }), 'mdp-watch-status__trigger')
  expect(trigger.props['data-mdp-watch-phase']).toBe('busy')
  expect(trigger.props.disabled).toBe(true)
  expect(trigger.props['aria-busy']).toBe(true)
  mocks.phase = 'success'
  trigger = find(WatchStatus({ state }), 'mdp-watch-status__trigger')
  expect(trigger.props['data-mdp-watch-phase']).toBe('success')
  expect(trigger.props['aria-label']).toBe('Document updated')
  expect(trigger.props.disabled).toBe(false)
})
