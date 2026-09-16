import { deepMerge } from '../shared/deep-merge.js'
import { logger } from '../shared/logger.js'
import { DEFAULT_SETTINGS } from './default-settings.js'
import { normalizeSettings } from './settings-schema.js'

export const STORAGE_KEYS = {
  SETTINGS: 'mdViewer.settings'
}

function getStorageArea() {
  return chrome.storage.sync || chrome.storage.local
}

async function getRawSettings() {
  const storage = getStorageArea()
  const data = await storage.get(STORAGE_KEYS.SETTINGS)
  return data[STORAGE_KEYS.SETTINGS] || null
}

async function getSettings() {
  const raw = await getRawSettings()
  const merged = deepMerge(DEFAULT_SETTINGS, raw || {})
  return normalizeSettings(merged, { invalid: 'default' })
}

async function saveSettings(partialSettings) {
  const storage = getStorageArea()
  const current = await getSettings()
  const nextSettings = normalizeSettings(deepMerge(current, partialSettings || {}))

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
