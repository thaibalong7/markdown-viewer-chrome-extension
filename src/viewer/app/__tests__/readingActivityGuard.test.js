import { afterEach, expect, it, vi } from 'vitest'
import { createReadingActivityGuard } from '../readingActivityGuard.js'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('protects a held pointer, then releases after idle and removes listeners on teardown', () => {
  vi.useFakeTimers()
  const eventTarget = new EventTarget()
  const remove = vi.spyOn(eventTarget, 'removeEventListener')
  const guard = createReadingActivityGuard({ eventTarget })
  guard.start()
  eventTarget.dispatchEvent(new Event('pointerdown'))
  vi.advanceTimersByTime(10000)
  expect(guard.isActive()).toBe(true)
  eventTarget.dispatchEvent(new Event('pointerup'))
  expect(guard.isActive()).toBe(true)
  vi.advanceTimersByTime(1500)
  expect(guard.isActive()).toBe(false)
  guard.destroy()
  expect(remove).toHaveBeenCalledTimes(8)
  eventTarget.dispatchEvent(new Event('wheel'))
  expect(guard.isActive()).toBe(false)
})

it('protects article selection, focused links and an open update panel', () => {
  const selectedNode = {}
  const unrelatedNode = {}
  const eventTarget = { getSelection: () => ({ isCollapsed: false, anchorNode: selectedNode }) }
  const article = { contains: (node) => node === selectedNode }
  let open = false
  const guard = createReadingActivityGuard({
    eventTarget, getArticleEl: () => article,
    getInteractionRoot: () => ({ querySelector: () => open })
  })
  expect(guard.isActive()).toBe(true)
  eventTarget.getSelection = () => ({ isCollapsed: false, anchorNode: unrelatedNode })
  expect(guard.isActive()).toBe(false)
  eventTarget.activeElement = selectedNode
  expect(guard.isActive()).toBe(true)
  eventTarget.activeElement = null
  open = true
  expect(guard.isActive()).toBe(true)
})
