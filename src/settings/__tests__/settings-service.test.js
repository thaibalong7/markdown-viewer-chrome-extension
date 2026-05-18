import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import { STORAGE_KEYS, settingsService } from '../settings-service.js'

describe('settingsService', () => {
  let storedSettings
  let storage

  beforeEach(() => {
    storedSettings = {
      theme: { preset: 'dark' },
      typography: { fontSize: 18 },
      plugins: {
        mermaid: { enabled: true }
      }
    }
    storage = {
      get: vi.fn(async (key) => ({ [key]: storedSettings })),
      set: vi.fn(async (next) => {
        storedSettings = next[STORAGE_KEYS.SETTINGS]
      })
    }
    globalThis.chrome = {
      storage: {
        sync: storage,
        local: null
      }
    }
  })

  afterEach(() => {
    delete globalThis.chrome
  })

  it('deep merges stored settings over defaults', async () => {
    const settings = await settingsService.getSettings()

    expect(settings.theme.preset).toBe('dark')
    expect(settings.typography.fontSize).toBe(18)
    expect(settings.typography.lineHeight).toBe(DEFAULT_SETTINGS.typography.lineHeight)
    expect(settings.plugins.mermaid.enabled).toBe(true)
    expect(settings.plugins.math.enabled).toBe(DEFAULT_SETTINGS.plugins.math.enabled)
    expect(settings.explorer.maxFiles).toBe(DEFAULT_SETTINGS.explorer.maxFiles)
  })

  it('deep merges partial saves with the current settings', async () => {
    const settings = await settingsService.saveSettings({
      layout: { contentMaxWidth: 860 }
    })

    expect(settings.theme.preset).toBe('dark')
    expect(settings.layout.contentMaxWidth).toBe(860)
    expect(settings.layout.showToc).toBe(DEFAULT_SETTINGS.layout.showToc)
    expect(storage.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.SETTINGS]: settings
    })
  })

  it('resets to a fresh copy of defaults', async () => {
    const settings = await settingsService.resetSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })
})
