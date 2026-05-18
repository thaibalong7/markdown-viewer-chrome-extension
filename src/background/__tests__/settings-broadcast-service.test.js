import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { broadcastSettingsUpdated } from '../settings-broadcast-service.js'

describe('broadcastSettingsUpdated', () => {
  it('broadcasts settings updates and ignores tabs that cannot receive messages', async () => {
    const tabsApi = {
      query: vi.fn(async () => [{ id: 1 }, { id: 2 }, { id: null }, {}]),
      sendMessage: vi.fn(async (tabId) => {
        if (tabId === 2) throw new Error('No receiving end')
      })
    }
    const settings = { theme: { preset: 'dark' } }

    await expect(broadcastSettingsUpdated(settings, { tabsApi })).resolves.toEqual({
      attempted: 2
    })
    expect(tabsApi.query).toHaveBeenCalledWith({})
    expect(tabsApi.sendMessage).toHaveBeenCalledWith(1, {
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: settings
    })
    expect(tabsApi.sendMessage).toHaveBeenCalledWith(2, {
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: settings
    })
  })
})
