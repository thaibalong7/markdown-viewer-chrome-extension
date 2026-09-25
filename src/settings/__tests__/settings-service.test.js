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
    expect(settings.editor.enabled).toBe(false)
    expect(settings.explorer.maxFiles).toBe(DEFAULT_SETTINGS.explorer.maxFiles)
    expect(settings.explorer.respectGitignore).toBe(true)
    expect(settings.explorer.restoreLastWorkspace).toBe(true)
    expect(settings.history).toEqual(DEFAULT_SETTINGS.history)
    expect(settings.documents).toEqual(DEFAULT_SETTINGS.documents)
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

  it('normalizes numeric strings before persisting', async () => {
    const settings = await settingsService.saveSettings({
      explorer: {
        maxScanDepth: '8',
        maxFiles: '3500',
        maxFolders: '750'
      }
    })

    expect(settings.explorer).toEqual({
      maxScanDepth: 8,
      maxFiles: 3500,
      maxFolders: 750,
      respectGitignore: true,
      restoreLastWorkspace: true
    })
  })

  it('rejects invalid partial saves without persisting them', async () => {
    await expect(
      settingsService.saveSettings({ explorer: { maxFiles: -1 } })
    ).rejects.toThrow('Maximum indexed files must be between 10 and 20,000.')
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('normalizes and persists file-history policy without affecting other settings', async () => {
    const settings = await settingsService.saveSettings({
      history: { enabled: false, maxEntries: '25' }
    })

    expect(settings.history).toEqual({ enabled: false, maxEntries: 25 })
    expect(settings.theme.preset).toBe('dark')
  })

  it('normalizes and persists the standalone text document limit', async () => {
    const settings = await settingsService.saveSettings({
      documents: { maxStandaloneTextFileSizeMiB: '18' }
    })

    expect(settings.documents).toEqual({ maxStandaloneTextFileSizeMiB: 18 })
    expect(settings.theme.preset).toBe('dark')
  })

  it('uses safe defaults for corrupt stored explorer limits', async () => {
    storedSettings = {
      explorer: {
        maxScanDepth: -1,
        maxFiles: 'many',
        maxFolders: Infinity
      }
    }

    const settings = await settingsService.getSettings()

    expect(settings.explorer).toEqual(DEFAULT_SETTINGS.explorer)
  })

  it('uses the safe default for a corrupt stored document limit', async () => {
    storedSettings = {
      documents: { maxStandaloneTextFileSizeMiB: 500 }
    }

    const settings = await settingsService.getSettings()

    expect(settings.documents).toEqual(DEFAULT_SETTINGS.documents)
  })

  it('resets only explorer settings when saving the explorer defaults patch', async () => {
    const settings = await settingsService.saveSettings({
      explorer: { ...DEFAULT_SETTINGS.explorer }
    })

    expect(settings.explorer).toEqual(DEFAULT_SETTINGS.explorer)
    expect(settings.theme.preset).toBe('dark')
    expect(settings.typography.fontSize).toBe(18)
  })

  it('resets to a fresh copy of defaults', async () => {
    const settings = await settingsService.resetSettings()

    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings).not.toBe(DEFAULT_SETTINGS)
  })
})
