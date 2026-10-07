import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { broadcastSettingsUpdated } from '../settings-broadcast-service.js'

describe('broadcastSettingsUpdated', () => {
  it('broadcasts settings updates and ignores tabs that cannot receive messages', async () => {
    const tabsApi = {
      query: vi.fn(async () => [{ id: 1 }, { id: 2 }, { id: null }, {}]),
      sendMessage: vi.fn((tabId) => {
        if (tabId === 2) throw new Error('No receiving end')
      })
    }
    const runtimeApi = { lastError: undefined }
    const settings = { theme: { activeId: 'dark', customThemes: [] } }

    await expect(broadcastSettingsUpdated(settings, { tabsApi, runtimeApi })).resolves.toEqual({
      attempted: 2
    })
    expect(tabsApi.query).toHaveBeenCalledWith({})
    expect(tabsApi.sendMessage).toHaveBeenCalledWith(1, {
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: settings
    }, expect.any(Function))
    expect(tabsApi.sendMessage).toHaveBeenCalledWith(2, {
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: settings
    }, expect.any(Function))
  })

  it('consumes Chrome delivery errors from tabs without a content script', async () => {
    const readLastError = vi.fn(() => ({ message: 'No receiving end' }))
    const runtimeApi = { get lastError() { return readLastError() } }
    const tabsApi = {
      query: vi.fn(async () => [{ id: 1 }]),
      sendMessage: vi.fn((_tabId, _message, callback) => callback())
    }

    await expect(broadcastSettingsUpdated({}, { tabsApi, runtimeApi })).resolves.toEqual({
      attempted: 1
    })
    expect(readLastError).toHaveBeenCalledOnce()
  })

  it('finishes dispatching even when a receiving tab never responds', async () => {
    const tabsApi = {
      query: vi.fn(async () => [{ id: 1 }, { id: 2 }]),
      sendMessage: vi.fn((_tabId, _message, callback) => {
        // Chrome's callback overload returns immediately, even without a response.
        if (callback) return undefined
        return new Promise(() => {})
      })
    }
    const runtimeApi = { lastError: undefined }
    const completed = vi.fn()
    const operation = broadcastSettingsUpdated(
      { plugins: { mermaid: { renderer: 'beautiful' } } },
      { tabsApi, runtimeApi }
    ).then(completed)

    await vi.waitFor(() => {
      expect(completed).toHaveBeenCalledWith({ attempted: 2 })
    }, { timeout: 100 })
    await operation
    expect(tabsApi.sendMessage).toHaveBeenCalledTimes(2)
  })
})
