import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { getSettings, resetSettings, saveSettings } from '../settings-client.js'

describe('settings client', () => {
  let sendMessage

  beforeEach(() => {
    sendMessage = vi.fn(async () => ({ ok: true, data: { enabled: true } }))
    globalThis.chrome = { runtime: { sendMessage } }
  })

  afterEach(() => {
    delete globalThis.chrome
  })

  it('uses the shared message types and unwraps successful envelopes', async () => {
    await expect(getSettings()).resolves.toEqual({ enabled: true })
    await saveSettings({ enabled: false })
    await resetSettings()

    expect(sendMessage).toHaveBeenNthCalledWith(1, { type: MESSAGE_TYPES.GET_SETTINGS })
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.SAVE_SETTINGS,
      payload: { enabled: false }
    })
    expect(sendMessage).toHaveBeenNthCalledWith(3, { type: MESSAGE_TYPES.RESET_SETTINGS })
  })

  it('turns error envelopes into caller-visible errors', async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, error: 'Storage unavailable.' })

    await expect(getSettings()).rejects.toThrow('Storage unavailable.')
  })
})
