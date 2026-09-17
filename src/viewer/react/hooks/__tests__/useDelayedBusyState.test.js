import { describe, expect, it, vi } from 'vitest'
import {
  createDelayedBusyStateController
} from '../useDelayedBusyState.js'

describe('delayed busy state controller', () => {
  it('does not expose loading UI for work that finishes before the delay', async () => {
    vi.useFakeTimers()
    const onVisibleChange = vi.fn()
    const controller = createDelayedBusyStateController({
      delayMs: 160,
      minVisibleMs: 260,
      onVisibleChange
    })

    try {
      controller.update(true)
      await vi.advanceTimersByTimeAsync(100)
      controller.update(false)
      await vi.advanceTimersByTimeAsync(200)

      expect(controller.isVisible()).toBe(false)
      expect(onVisibleChange).not.toHaveBeenCalled()
    } finally {
      controller.destroy()
      vi.useRealTimers()
    }
  })

  it('keeps a visible loading state long enough to avoid a flash', async () => {
    vi.useFakeTimers()
    const onVisibleChange = vi.fn()
    const controller = createDelayedBusyStateController({
      delayMs: 160,
      minVisibleMs: 260,
      onVisibleChange
    })

    try {
      controller.update(true)
      await vi.advanceTimersByTimeAsync(160)
      expect(controller.isVisible()).toBe(true)

      await vi.advanceTimersByTimeAsync(40)
      controller.update(false)
      await vi.advanceTimersByTimeAsync(219)
      expect(controller.isVisible()).toBe(true)

      await vi.advanceTimersByTimeAsync(1)
      expect(controller.isVisible()).toBe(false)
      expect(onVisibleChange.mock.calls.map(([value]) => value)).toEqual([true, false])
    } finally {
      controller.destroy()
      vi.useRealTimers()
    }
  })
})
