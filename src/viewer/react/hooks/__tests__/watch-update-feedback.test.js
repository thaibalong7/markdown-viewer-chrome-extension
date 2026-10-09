import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWatchUpdateFeedback } from '../watch-update-feedback.js'

const initial = { available: true, supported: true, generation: 1, acceptedSource: 'old', pending: true, mode: 'ask' }
function mount() {
  const publish = vi.fn()
  const feedback = createWatchUpdateFeedback(publish)
  feedback.start(initial)
  feedback.sync({ ...initial, manualChecking: true })
  return { feedback, publish }
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
afterEach(() => vi.useRealTimers())

it('holds a fast read for 720ms, confirms a real accepted revision, then fades to idle after 1000ms', () => {
  const { feedback, publish } = mount()
  vi.advanceTimersByTime(400)
  feedback.sync({ ...initial, acceptedSource: 'new', pending: false, manualChecking: false })
  vi.advanceTimersByTime(319)
  expect(publish.mock.calls).toEqual([['busy']])
  vi.advanceTimersByTime(1)
  expect(publish).toHaveBeenLastCalledWith('success')
  vi.advanceTimersByTime(999)
  expect(publish).toHaveBeenLastCalledWith('success')
  vi.advanceTimersByTime(1)
  expect(publish).toHaveBeenLastCalledWith(null)
})

it('keeps busy for the full real request and never manufactures success for unstable writes', () => {
  const { feedback, publish } = mount()
  vi.advanceTimersByTime(3000)
  expect(publish.mock.calls).toEqual([['busy']])
  feedback.sync({ ...initial, manualChecking: false })
  vi.advanceTimersByTime(1)
  expect(publish.mock.calls).toEqual([['busy'], [null]])
})

it.each([
  { error: 'Read failed' }, { generation: 2 }, { available: false }, { supported: false }, { mode: 'auto' }, { isEditMode: true }
])('cancels stale feedback on %j', (change) => {
  const { feedback, publish } = mount()
  feedback.sync({ ...initial, ...change })
  vi.runAllTimers()
  expect(publish.mock.calls).toEqual([['busy'], [null]])
})

it('prioritizes a new pending revision and navigation over an old success confirmation', () => {
  const { feedback, publish } = mount()
  feedback.sync({ ...initial, acceptedSource: 'new', pending: false, manualChecking: false })
  vi.advanceTimersByTime(720)
  expect(publish).toHaveBeenLastCalledWith('success')
  feedback.sync({ ...initial, generation: 2, acceptedSource: 'another', pending: false })
  expect(publish).toHaveBeenLastCalledWith(null)
  feedback.start(initial)
  feedback.sync({ ...initial, manualChecking: true })
  feedback.sync({ ...initial, acceptedSource: 'new', pending: false, manualChecking: false })
  vi.advanceTimersByTime(720)
  feedback.sync({ ...initial, acceptedSource: 'new', pending: true })
  expect(publish).toHaveBeenLastCalledWith(null)
})

it('recovers a declined activation and cleans up pending timers without updating an unmounted component', () => {
  const publish = vi.fn()
  const feedback = createWatchUpdateFeedback(publish)
  feedback.start(initial)
  vi.advanceTimersByTime(720)
  expect(publish.mock.calls).toEqual([['busy'], [null]])
  feedback.start(initial)
  publish.mockClear()
  feedback.cancel(false)
  vi.runAllTimers()
  expect(publish).not.toHaveBeenCalled()
})
