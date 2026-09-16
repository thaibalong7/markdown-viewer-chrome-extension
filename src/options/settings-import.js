import { DEFAULT_SETTINGS } from '../settings/default-settings.js'
import { normalizeSettings } from '../settings/settings-schema.js'
import { deepMerge } from '../shared/deep-merge.js'

export function parseSettingsJson(source) {
  let parsed
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse file.'
    throw new Error(`Invalid JSON: ${message}`)
  }

  const normalizedImport = normalizeSettings(parsed)
  return normalizeSettings(deepMerge(DEFAULT_SETTINGS, normalizedImport))
}
