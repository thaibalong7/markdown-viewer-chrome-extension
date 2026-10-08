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

it('does not let persistent selection, focus or update chrome block an idle automatic apply', () => {
  vi.useFakeTimers()
  const selectedNode = {}
  const eventTarget = new EventTarget()
  eventTarget.getSelection = () => ({ isCollapsed: false, anchorNode: selectedNode })
  eventTarget.activeElement = selectedNode
  const guard = createReadingActivityGuard({ eventTarget })
  guard.start()
  eventTarget.dispatchEvent(new Event('pointerup'))
  expect(guard.isActive()).toBe(true)
  vi.advanceTimersByTime(1500)
  expect(guard.isActive()).toBe(false)
  guard.destroy()
})
