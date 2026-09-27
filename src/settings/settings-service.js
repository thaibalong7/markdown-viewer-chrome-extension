import { deepMerge } from '../shared/deep-merge.js'
import { logger } from '../shared/logger.js'
import { DEFAULT_SETTINGS } from './default-settings.js'
import { normalizeSettings } from './settings-schema.js'

export const STORAGE_KEYS = {
  SETTINGS: 'mdViewer.settings'
}

const CURRENT_SETTINGS_VERSION = 2

function getStorageArea() {
  return chrome.storage.sync || chrome.storage.local
}

async function getRawSettings() {
  const storage = getStorageArea()
  const data = await storage.get(STORAGE_KEYS.SETTINGS)
  return data[STORAGE_KEYS.SETTINGS] || null
}

function migrateSettings(rawSettings) {
  const migrated = deepMerge({}, rawSettings || {})
  const version = Number(migrated.version) || 1
  if (version < 2) {
    const legacyPreset = migrated.theme?.preset
    migrated.theme = {
      activeId: migrated.theme?.activeId || legacyPreset || DEFAULT_SETTINGS.theme.activeId,
      customThemes: Array.isArray(migrated.theme?.customThemes)
        ? migrated.theme.customThemes
        : []
    }
    if (migrated.appearance && typeof migrated.appearance === 'object') {
      delete migrated.appearance.background
    }
  }
  migrated.version = CURRENT_SETTINGS_VERSION
  return migrated
}

async function getSettings() {
  const raw = await getRawSettings()
  const merged = deepMerge(DEFAULT_SETTINGS, migrateSettings(raw))
  return normalizeSettings(merged, { invalid: 'default' })
}

async function saveSettings(partialSettings) {
  const storage = getStorageArea()
  const current = await getSettings()
  const nextSettings = normalizeSettings(deepMerge(current, partialSettings || {}))
  nextSettings.version = CURRENT_SETTINGS_VERSION

  await storage.set({
    [STORAGE_KEYS.SETTINGS]: nextSettings
  })

  logger.info('Settings saved.')
  return nextSettings
}

async function resetSettings() {
  const storage = getStorageArea()
  const fresh = normalizeSettings(deepMerge({}, DEFAULT_SETTINGS))
  await storage.set({
    [STORAGE_KEYS.SETTINGS]: fresh
  })

  logger.info('Settings reset to default.')
  return fresh
}

export const settingsService = {
  getSettings,
  saveSettings,
  resetSettings
}
