import { getDefaultPluginSettings } from '../plugins/plugin-types.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH
} from '../shared/constants/explorer.js'
import { deepMerge } from '../shared/deep-merge.js'
import { logger } from '../shared/logger.js'

const STORAGE_KEYS = {
  SETTINGS: 'mdViewer.settings'
}

export const DEFAULT_SETTINGS = {
  enabled: true,
  layout: {
    showToc: true,
    tocWidth: 280,
    contentMaxWidth: 980
  },
  theme: {
    preset: 'light'
  },
  typography: {
    fontFamily: 'system-ui',
    fontSize: 16,
    lineHeight: 1.7
  },
  plugins: getDefaultPluginSettings(),
  explorer: {
    maxScanDepth: DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
    maxFiles: DEFAULT_EXPLORER_MAX_FILES,
    maxFolders: DEFAULT_EXPLORER_MAX_FOLDERS
  },
  version: 1
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
  return deepMerge(DEFAULT_SETTINGS, raw || {})
}

async function saveSettings(partialSettings) {
  const storage = getStorageArea()
  const current = await getSettings()
  const nextSettings = deepMerge(current, partialSettings || {})

  await storage.set({
    [STORAGE_KEYS.SETTINGS]: nextSettings
  })

  logger.info('Settings saved.', nextSettings)
  return nextSettings
}

async function resetSettings() {
  const storage = getStorageArea()
  const fresh = deepMerge({}, DEFAULT_SETTINGS)
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
