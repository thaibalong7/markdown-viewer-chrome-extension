import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import {
  DOCUMENT_FIELDS,
  EXPLORER_BEHAVIOR_FIELDS,
  EXPLORER_LIMIT_FIELDS,
  HISTORY_FIELDS,
  SettingsValidationError,
  normalizeDocumentSettings,
  normalizeBackgroundSettings,
  normalizeExplorerSettings,
  normalizeHistorySettings,
  normalizeThemeSettings,
  normalizeSettings
} from '../settings-schema.js'

describe('settings schema', () => {
  it('normalizes numeric strings into bounded integers', () => {
    expect(
      normalizeExplorerSettings({
        maxScanDepth: '0',
        maxFiles: '20000',
        maxFolders: '1'
      })
    ).toEqual({
      maxScanDepth: 0,
      maxFiles: 20_000,
      maxFolders: 1
    })
  })

  it.each([
    ['maxScanDepth', -1],
    ['maxScanDepth', 21],
    ['maxFiles', 9],
    ['maxFiles', 20_001],
    ['maxFolders', 0],
    ['maxFolders', 5_001],
    ['maxFiles', Number.NaN],
    ['maxFiles', Number.POSITIVE_INFINITY],
    ['maxFolders', 1.5],
    ['maxScanDepth', '']
  ])('rejects invalid %s value %s', (field, value) => {
    const explorer = { ...DEFAULT_SETTINGS.explorer, [field]: value }

    expect(() => normalizeExplorerSettings(explorer)).toThrow(SettingsValidationError)
  })

  it('exposes the hard safety ranges', () => {
    expect(EXPLORER_LIMIT_FIELDS.maxScanDepth).toMatchObject({ min: 0, max: 20 })
    expect(EXPLORER_LIMIT_FIELDS.maxFiles).toMatchObject({ min: 10, max: 20_000 })
    expect(EXPLORER_LIMIT_FIELDS.maxFolders).toMatchObject({ min: 1, max: 5_000 })
  })

  it('accepts boolean explorer behavior settings', () => {
    expect(
      normalizeExplorerSettings({ respectGitignore: false, restoreLastWorkspace: false })
    ).toEqual({ respectGitignore: false, restoreLastWorkspace: false })
    expect(EXPLORER_BEHAVIOR_FIELDS.respectGitignore.defaultValue).toBe(true)
    expect(EXPLORER_BEHAVIOR_FIELDS.restoreLastWorkspace.defaultValue).toBe(true)
  })

  it('normalizes and bounds file-history policy', () => {
    expect(normalizeHistorySettings({ enabled: false, maxEntries: '50' })).toEqual({
      enabled: false,
      maxEntries: 50
    })
    expect(HISTORY_FIELDS.maxEntries).toMatchObject({ min: 1, max: 50, defaultValue: 12 })
  })

  it('normalizes and bounds the standalone text document limit', () => {
    expect(normalizeDocumentSettings({ maxStandaloneTextFileSizeMiB: '25' })).toEqual({
      maxStandaloneTextFileSizeMiB: 25
    })
    expect(DOCUMENT_FIELDS.maxStandaloneTextFileSizeMiB).toMatchObject({
      min: 1,
      max: 50,
      defaultValue: 5
    })
  })

  it.each([0, 51, 1.5, Number.NaN, Number.POSITIVE_INFINITY, ''])(
    'rejects invalid standalone text document limit %s',
    (value) => {
      expect(() => normalizeDocumentSettings({
        maxStandaloneTextFileSizeMiB: value
      })).toThrow(SettingsValidationError)
    }
  )

  it.each([
    ['enabled', 'false'],
    ['maxEntries', 0],
    ['maxEntries', 51],
    ['maxEntries', 1.5],
    ['maxEntries', Number.NaN],
    ['maxEntries', '']
  ])('rejects invalid history %s value %s', (field, value) => {
    expect(() => normalizeHistorySettings({ [field]: value })).toThrow(SettingsValidationError)
  })

  it.each(['respectGitignore', 'restoreLastWorkspace'])(
    'rejects non-boolean %s values',
    (field) => {
      expect(() => normalizeExplorerSettings({ [field]: 'false' })).toThrow(
        `${EXPLORER_BEHAVIOR_FIELDS[field].label} must be true or false.`
      )
    }
  )

  it('falls back to defaults when normalizing corrupt stored values', () => {
    const normalized = normalizeSettings(
      {
        ...DEFAULT_SETTINGS,
        explorer: {
          maxScanDepth: -4,
          maxFiles: 'not-a-number',
          maxFolders: Infinity,
          respectGitignore: 'yes',
          restoreLastWorkspace: 1
        },
        history: { enabled: 'yes', maxEntries: 500 },
        documents: { maxStandaloneTextFileSizeMiB: 200 },
        theme: { activeId: 'missing', customThemes: [{ nope: true }] },
        appearance: { background: { mode: 'remote' }, scrollbarVisibility: 'sometimes' }
      },
      { invalid: 'default' }
    )

    expect(normalized.explorer).toEqual(DEFAULT_SETTINGS.explorer)
    expect(normalized.history).toEqual(DEFAULT_SETTINGS.history)
    expect(normalized.documents).toEqual(DEFAULT_SETTINGS.documents)
    expect(normalized.theme).toEqual(DEFAULT_SETTINGS.theme)
    expect(normalized.appearance).not.toHaveProperty('background')
    expect(normalized.appearance.scrollbarVisibility).toBe('auto')
    expect(
      normalizeSettings({ ...DEFAULT_SETTINGS, explorer: null }, { invalid: 'default' }).explorer
    ).toEqual(DEFAULT_SETTINGS.explorer)
  })

  it('rejects non-object imports and invalid enabled values', () => {
    expect(() => normalizeSettings([])).toThrow('Settings must be a JSON object.')
    expect(() => normalizeSettings({ ...DEFAULT_SETTINGS, enabled: 'yes' })).toThrow(
      'Enable Markdown Plus must be true or false.'
    )
    expect(() => normalizeSettings({ editor: { enabled: 'yes' } })).toThrow(
      'Enable experimental editor must be true or false.'
    )
  })

  it('defaults corrupt editor feature settings to disabled', () => {
    expect(
      normalizeSettings({ ...DEFAULT_SETTINGS, editor: { enabled: 'yes' } }, { invalid: 'default' })
        .editor.enabled
    ).toBe(false)
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, editor: null }, { invalid: 'default' }).editor)
      .toEqual(DEFAULT_SETTINGS.editor)
  })

  it('normalizes valid partial settings without inventing unrelated fields', () => {
    expect(normalizeSettings({ enabled: false })).toEqual({ enabled: false })
    expect(normalizeSettings({ editor: { enabled: true } })).toEqual({
      editor: { enabled: true }
    })
    expect(normalizeSettings({ explorer: { maxFiles: '1200' } })).toEqual({
      explorer: { maxFiles: 1200 }
    })
    expect(normalizeSettings({ history: { maxEntries: '24' } })).toEqual({
      history: { maxEntries: 24 }
    })
    expect(normalizeSettings({
      documents: { maxStandaloneTextFileSizeMiB: '12' }
    })).toEqual({
      documents: { maxStandaloneTextFileSizeMiB: 12 }
    })
    expect(normalizeSettings({
      appearance: {
        background: { mode: 'preset', preset: 'aurora', overlayOpacity: '0.25' },
        scrollbarVisibility: 'always'
      }
    })).toEqual({
      appearance: {
        scrollbarVisibility: 'always'
      }
    })
  })

  it('validates structured theme backgrounds without accepting remote URLs or CSS', () => {
    expect(() => normalizeBackgroundSettings({ type: 'url', url: 'https://example.com/a.jpg' }))
      .toThrow('Choose a supported background type.')
    expect(() => normalizeBackgroundSettings({ type: 'gradient', css: 'url(https://example.com)' }))
      .toThrow('Choose a valid hexadecimal color.')
    expect(() => normalizeBackgroundSettings({ type: 'none', motion: 'fast' }))
      .toThrow('Choose a supported background motion policy.')
    expect(() => normalizeBackgroundSettings({ type: 'solid', color: '#123456', overlayOpacity: 1 }))
      .toThrow('Background dimming must be between 0 and 0.8.')
    expect(normalizeBackgroundSettings({
      type: 'image',
      assetId: 'theme-asset:12345678',
      fit: 'contain',
      position: 'top',
      repeat: true
    })).toMatchObject({
      type: 'image',
      assetId: 'theme-asset:12345678',
      fit: 'contain',
      position: 'top',
      repeat: true
    })
    expect(() => normalizeSettings({
      appearance: { scrollbarVisibility: 'hover-only' }
    })).toThrow('Choose auto-hide or always-visible scrollbars.')
  })

  it('normalizes named custom themes and requires the active id to exist', () => {
    const theme = normalizeThemeSettings({
      activeId: 'custom:midnight-1234',
      customThemes: [{
        id: 'custom:midnight-1234',
        name: 'Midnight',
        baseId: 'dark',
        colors: { background: '#101827', link: '#67e8f9' },
        background: {
          type: 'gradient',
          startColor: '#101827',
          endColor: '#312e81',
          angle: '145'
        }
      }]
    })

    expect(theme.activeId).toBe('custom:midnight-1234')
    expect(theme.customThemes[0]).toMatchObject({
      name: 'Midnight',
      baseId: 'dark',
      colors: { background: '#101827', link: '#67e8f9' },
      background: { type: 'gradient', angle: 145 }
    })
    expect(() => normalizeThemeSettings({ activeId: 'custom:missing', customThemes: [] }))
      .toThrow('Choose an available theme.')
  })
})
