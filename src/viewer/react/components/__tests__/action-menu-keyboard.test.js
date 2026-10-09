import React from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ActionMenu } from '../common/ActionMenu.jsx'

vi.mock('react', async original => ({
  ...await original(), useRef: () => ({ current: null }), useId: () => 'test-menu',
  useCallback: callback => callback, useEffect: () => {}
}))

function mount(items = []) {
  const onToggle = vi.fn()
  const tree = ActionMenu.render({ items, onToggle, open: true }, null)
  const [trigger, menu] = React.Children.toArray(tree.props.children)
  const button = { focus: vi.fn() }
  trigger.props.ref(button)
  const choices = [{ focus: vi.fn() }, { focus: vi.fn() }, { focus: vi.fn() }]
  menu.props.ref.current = { querySelectorAll: () => choices }
  const key = (key, target = choices[0]) => {
    const event = { key, target, preventDefault: vi.fn() }
    menu.props.onKeyDown(event)
    return event
  }
  return { menu, choices, button, onToggle, key }
}
beforeEach(() => vi.clearAllMocks())

it('moves through enabled menu choices, wrapping and supporting Home/End', () => {
  const m = mount()
  expect(m.key('ArrowUp').preventDefault).toHaveBeenCalledOnce()
  expect(m.choices[2].focus).toHaveBeenCalledOnce()
  m.key('ArrowDown', m.choices[2])
  expect(m.choices[0].focus).toHaveBeenCalledOnce()
  m.key('End')
  expect(m.choices[2].focus).toHaveBeenCalledTimes(2)
  m.key('Home')
  expect(m.choices[0].focus).toHaveBeenCalledTimes(2)
})
it('lets native Tab continue from the visible trigger after closing', () => {
  const m = mount()
  const event = m.key('Tab')
  expect(m.button.focus).toHaveBeenCalledWith({ preventScroll: true })
  expect(m.onToggle).toHaveBeenCalledWith(event)
  expect(event.preventDefault).not.toHaveBeenCalled()
})
it('does not steal focus back after an item opens a dialog', async () => {
  const action = vi.fn()
  const m = mount([{ key: 'edit', label: 'Edit', restoreFocus: false, onClick: action }])
  const fragment = React.Children.toArray(m.menu.props.children)[0]
  const button = React.Children.toArray(fragment.props.children).find(node => node.type === 'button')
  button.props.onClick({})
  await Promise.resolve()
  expect(action).toHaveBeenCalledOnce()
  expect(m.button.focus).not.toHaveBeenCalled()
})
