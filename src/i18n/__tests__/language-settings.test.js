import { afterEach, describe, expect, it, vi } from 'vitest'
import { settingsService, STORAGE_KEYS } from '../../settings/settings-service.js'
import { broadcastSettingsUpdated } from '../../background/settings-broadcast-service.js'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { createStorageArea } from '../../settings/__tests__/storage-harness.js'

afterEach(() => { delete globalThis.chrome })

describe('persisted interface language', () => {
  function storage(raw) {
    const area = createStorageArea({ [STORAGE_KEYS.SETTINGS]: raw })
    globalThis.chrome = { storage: { sync: area } }
    return area
  }

  it.each(['vi', 'zh-CN'])('loads older preferences and round-trips %s without losing other settings', async (language) => {
    storage({ version: 2, typography: { fontSize: 22 }, editor: { enabled: true } })
    expect((await settingsService.getSettings()).language).toBe('auto')
    const saved = await settingsService.saveSettings({ language })
    expect(saved.language).toBe(language)
    const restored = await settingsService.getSettings()
    expect(restored.language).toBe(language)
    expect(restored.typography.fontSize).toBe(22)
    expect(restored.editor.enabled).toBe(true)
    expect((await settingsService.resetSettings()).language).toBe('auto')
  })

  it('recovers unsupported stored locales but refuses to persist unsupported input', async () => {
    const area = storage({ version: 2, language: 'missing' })
    expect((await settingsService.getSettings()).language).toBe('auto')
    await expect(settingsService.saveSettings({ language: 'missing' })).rejects.toThrow('Choose a supported interface language.')
    expect(area.set).not.toHaveBeenCalled()
  })

  it('notifies open extension pages as well as viewer tabs and consumes missing-receiver errors', async () => {
    const lastError = vi.fn(() => ({ message: 'No receiver' }))
    const runtimeApi = { get lastError() { return lastError() }, sendMessage: vi.fn((_message, callback) => callback()) }
    const tabsApi = { query: vi.fn(async () => [{ id: 4 }]), sendMessage: vi.fn((_id, _message, callback) => callback()) }
    const settings = { language: 'vi' }
    await broadcastSettingsUpdated(settings, { tabsApi, runtimeApi })
    expect(runtimeApi.sendMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: settings }, expect.any(Function))
    expect(tabsApi.sendMessage).toHaveBeenCalledWith(4, { type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: settings }, expect.any(Function))
    expect(lastError).toHaveBeenCalledTimes(2)
  })
})
