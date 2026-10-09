import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import { normalizeExplorerSettings } from '../settings-schema.js'
import { STORAGE_KEYS, settingsService } from '../settings-service.js'
import { needsFullRender } from '../../shared/settings-diff.js'

afterEach(() => { delete globalThis.chrome })
describe('tree indent guides settings', () => {
  it('defaults old settings to on, preserves false through partial saves and resets to on', async () => {
    let stored = { version: 2, explorer: { maxFiles: 800 } }
    globalThis.chrome = { storage: { sync: {
      get: vi.fn(async () => ({ [STORAGE_KEYS.SETTINGS]: stored })),
      set: vi.fn(async data => { stored = data[STORAGE_KEYS.SETTINGS] })
    } } }
    expect(DEFAULT_SETTINGS.explorer.showTreeIndentGuides).toBe(true)
    expect((await settingsService.getSettings()).explorer.showTreeIndentGuides).toBe(true)
    await settingsService.saveSettings({ explorer: { showTreeIndentGuides: false } })
    const updated = await settingsService.saveSettings({ explorer: { maxFiles: 1200 } })
    expect(updated.explorer.showTreeIndentGuides).toBe(false)
    expect((await settingsService.resetSettings()).explorer.showTreeIndentGuides).toBe(true)
  })

  it('validates the boolean and repairs corrupt stored values', () => {
    expect(normalizeExplorerSettings({ showTreeIndentGuides: false })).toEqual({ showTreeIndentGuides: false })
    expect(() => normalizeExplorerSettings({ showTreeIndentGuides: 'false' })).toThrow('must be true or false')
    expect(normalizeExplorerSettings({ showTreeIndentGuides: 'false' }, { invalid: 'default' }))
      .toEqual({ showTreeIndentGuides: true })
  })

  it('does not trigger a Markdown render when guides are toggled', () => {
    expect(needsFullRender(DEFAULT_SETTINGS, {
      ...DEFAULT_SETTINGS, explorer: { ...DEFAULT_SETTINGS.explorer, showTreeIndentGuides: false }
    })).toBe(false)
  })
})
