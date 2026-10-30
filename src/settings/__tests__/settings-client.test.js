import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { getSettings, resetSettings, saveSettings } from '../settings-client.js'
import { getSettingsStorageWarning, setSettingsStorageWarning } from '../settings-storage-status.js'
import { STORAGE_ERRORS } from '../settings-storage-errors.js'
import { getLanguagePreference } from '../../i18n/index.js'

describe('settings client', () => {
  let sendMessage

  beforeEach(() => {
    sendMessage = vi.fn(async () => ({ ok: true, data: { enabled: true } }))
    globalThis.chrome = { runtime: { sendMessage } }
  })

  afterEach(() => {
    delete globalThis.chrome
    setSettingsStorageWarning(null)
  })

  it('keeps cache warnings out of the settings object and clears them only after successful persistence', async () => {
    const snapshot = { language: 'vi', enabled: true }
    sendMessage.mockResolvedValueOnce({ ok: true, data: { settings: snapshot, warning: STORAGE_ERRORS.cached } })
    expect(await getSettings()).toEqual(snapshot)
    expect(getSettingsStorageWarning()).toBe(STORAGE_ERRORS.cached)
    sendMessage.mockResolvedValueOnce({ ok: false, error: STORAGE_ERRORS.pending })
    await expect(saveSettings({ language: 'en' })).rejects.toThrow(STORAGE_ERRORS.pending)
    expect(getSettingsStorageWarning()).toBe(STORAGE_ERRORS.cached)
    expect(getLanguagePreference()).toBe('vi')
    sendMessage.mockResolvedValueOnce({ ok: true, data: { ...snapshot, language: 'en' } })
    await saveSettings({ language: 'en' })
    expect(getSettingsStorageWarning()).toBeNull()
    expect(getLanguagePreference()).toBe('en')
  })

  it('uses the shared message types and unwraps successful envelopes', async () => {
    await expect(getSettings()).resolves.toEqual({ enabled: true })
    await saveSettings({ enabled: false })
    await resetSettings()

    expect(sendMessage).toHaveBeenNthCalledWith(1, { type: MESSAGE_TYPES.GET_SETTINGS, includeStorageStatus: true })
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
