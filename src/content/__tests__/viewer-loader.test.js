import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  teardownViewerRoot: vi.fn()
}))

vi.mock('../bootstrap.js', () => ({ bootstrap: mocks.bootstrap }))
vi.mock('../page-overrider.js', () => ({ teardownViewerRoot: mocks.teardownViewerRoot }))
vi.mock('../../shared/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

import { startViewer } from '../viewer-loader.js'

const VIEWER_RUNTIME_KEY = Symbol.for('markdown-plus.viewer-runtime')

function createRuntimeMessages() {
  const listeners = new Set()
  return {
    listeners,
    addListener: vi.fn((listener) => listeners.add(listener)),
    removeListener: vi.fn((listener) => listeners.delete(listener)),
    dispatch(message) {
      for (const listener of listeners) listener(message)
    }
  }
}

beforeEach(async () => {
  await globalThis[VIEWER_RUNTIME_KEY]?.dispose?.()
  delete globalThis[VIEWER_RUNTIME_KEY]
  vi.clearAllMocks()
  mocks.bootstrap.mockReset()
})

describe('viewer loader reinjection lifecycle', () => {
  it('hands off the app and keeps a single settings listener after reinjection', async () => {
    const onMessage = createRuntimeMessages()
    vi.stubGlobal('chrome', { runtime: { onMessage } })
    const firstApp = { destroy: vi.fn(), updateSettings: vi.fn() }
    const secondApp = { destroy: vi.fn(), updateSettings: vi.fn() }
    mocks.bootstrap
      .mockResolvedValueOnce(firstApp)
      .mockResolvedValueOnce(secondApp)

    await startViewer()
    await startViewer()

    expect(mocks.bootstrap).toHaveBeenNthCalledWith(1, expect.objectContaining({
      existingApp: null
    }))
    expect(mocks.bootstrap).toHaveBeenNthCalledWith(2, expect.objectContaining({
      existingApp: firstApp
    }))
    expect(onMessage.removeListener).toHaveBeenCalledOnce()
    expect(onMessage.listeners.size).toBe(1)

    onMessage.dispatch({
      type: 'SETTINGS_UPDATED',
      payload: { enabled: true }
    })

    expect(firstApp.updateSettings).not.toHaveBeenCalled()
    expect(secondApp.updateSettings).toHaveBeenCalledOnce()
  })

  it('removes the settings listener and destroys the app when disposed', async () => {
    const onMessage = createRuntimeMessages()
    vi.stubGlobal('chrome', { runtime: { onMessage } })
    const app = { destroy: vi.fn(), updateSettings: vi.fn() }
    mocks.bootstrap.mockResolvedValue(app)

    const dispose = await startViewer()
    await dispose()
    await dispose()

    expect(onMessage.listeners.size).toBe(0)
    expect(app.destroy).toHaveBeenCalledOnce()
    expect(mocks.teardownViewerRoot).toHaveBeenCalledOnce()
  })

  it('waits for an in-flight mount before handing its app to a reinjection', async () => {
    const onMessage = createRuntimeMessages()
    vi.stubGlobal('chrome', { runtime: { onMessage } })
    const firstApp = { destroy: vi.fn(), updateSettings: vi.fn() }
    const secondApp = { destroy: vi.fn(), updateSettings: vi.fn() }
    let resolveFirstMount
    mocks.bootstrap
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirstMount = resolve
      }))
      .mockResolvedValueOnce(secondApp)

    const firstStart = startViewer()
    await vi.waitFor(() => expect(mocks.bootstrap).toHaveBeenCalledTimes(1))
    const secondStart = startViewer()
    await Promise.resolve()

    expect(mocks.bootstrap).toHaveBeenCalledTimes(1)

    resolveFirstMount(firstApp)
    await firstStart
    await secondStart

    expect(mocks.bootstrap).toHaveBeenNthCalledWith(2, expect.objectContaining({
      existingApp: firstApp
    }))
    expect(onMessage.listeners.size).toBe(1)
  })
})
