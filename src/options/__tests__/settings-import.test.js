import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../settings/default-settings.js'
import { parseSettingsJson } from '../settings-import.js'

describe('settings JSON import', () => {
  it('normalizes a valid partial settings document against defaults', () => {
    const settings = parseSettingsJson(`{
      "enabled": false,
      "explorer": {
        "maxFiles": "4200"
      },
      "documents": {
        "maxStandaloneTextFileSizeMiB": "16"
      }
    }`)

    expect(settings.enabled).toBe(false)
    expect(settings.explorer).toEqual({
      ...DEFAULT_SETTINGS.explorer,
      maxFiles: 4200
    })
    expect(settings.theme).toEqual(DEFAULT_SETTINGS.theme)
    expect(settings.documents).toEqual({ maxStandaloneTextFileSizeMiB: 16 })
  })

  it('rejects malformed JSON and invalid fields before save can run', () => {
    expect(() => parseSettingsJson('{ nope')).toThrow('Invalid JSON:')
    expect(() => parseSettingsJson('{"explorer":{"maxFiles":-1}}')).toThrow(
      'Maximum indexed files must be between 10 and 20,000.'
    )
    expect(() => parseSettingsJson('[]')).toThrow('Settings must be a JSON object.')
    expect(() => parseSettingsJson('{"documents":{"maxStandaloneTextFileSizeMiB":51}}')).toThrow(
      'Standalone text file limit must be between 1 and 50.'
    )
  })
})
