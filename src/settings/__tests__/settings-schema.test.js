import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import {
  DOCUMENT_FIELDS,
  EXPLORER_BEHAVIOR_FIELDS,
  EXPLORER_LIMIT_FIELDS,
  HISTORY_FIELDS,
  SettingsValidationError,
  normalizeDocumentSettings,
  normalizeExplorerSettings,
  normalizeHistorySettings,
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
        documents: { maxStandaloneTextFileSizeMiB: 200 }
      },
      { invalid: 'default' }
    )

    expect(normalized.explorer).toEqual(DEFAULT_SETTINGS.explorer)
    expect(normalized.history).toEqual(DEFAULT_SETTINGS.history)
    expect(normalized.documents).toEqual(DEFAULT_SETTINGS.documents)
    expect(
      normalizeSettings({ ...DEFAULT_SETTINGS, explorer: null }, { invalid: 'default' }).explorer
    ).toEqual(DEFAULT_SETTINGS.explorer)
  })

  it('rejects non-object imports and invalid enabled values', () => {
    expect(() => normalizeSettings([])).toThrow('Settings must be a JSON object.')
    expect(() => normalizeSettings({ ...DEFAULT_SETTINGS, enabled: 'yes' })).toThrow(
      'Enable Markdown Plus must be true or false.'
    )
  })

  it('normalizes valid partial settings without inventing unrelated fields', () => {
    expect(normalizeSettings({ enabled: false })).toEqual({ enabled: false })
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
  })
})
