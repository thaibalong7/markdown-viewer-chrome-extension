import { describe, expect, it } from 'vitest'
import {
  createAbortableScanSession,
  isAbortError,
  throwIfAborted
} from '../explorer-scan-session.js'

describe('explorer scan session', () => {
  it('aborts the previous scan when a new scan starts', () => {
    const session = createAbortableScanSession()
    const first = session.start()
    expect(first.aborted).toBe(false)

    const second = session.start()
    expect(first.aborted).toBe(true)
    expect(second.aborted).toBe(false)
    expect(session.currentSignal()).toBe(second)
  })

  it('clears only the active signal', () => {
    const session = createAbortableScanSession()
    const first = session.start()
    const second = session.start()

    session.clear(first)
    expect(session.currentSignal()).toBe(second)

    session.clear(second)
    expect(session.currentSignal()).toBe(null)
  })

  it('throws AbortError for aborted signals', () => {
    const controller = new AbortController()
    controller.abort()

    expect(() => throwIfAborted(controller.signal)).toThrow(/cancelled/i)
    try {
      throwIfAborted(controller.signal)
    } catch (error) {
      expect(isAbortError(error, controller.signal)).toBe(true)
      expect(error.name).toBe('AbortError')
    }
  })
})
