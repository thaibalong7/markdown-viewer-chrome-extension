import { deepMerge } from '../shared/deep-merge.js'
import { logger } from '../shared/logger.js'
import { DEFAULT_SETTINGS } from './default-settings.js'
import { normalizeSettings } from './settings-schema.js'
import { createSettingsStorage } from './settings-storage.js'
import { encodeSettings, STORAGE_KEYS } from './settings-storage-format.js'
import { storageError } from './settings-storage-errors.js'
export { STORAGE_KEYS } from './settings-storage-format.js'

const CURRENT_SETTINGS_VERSION = 2

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

function loadSettings(raw) {
  const merged = deepMerge(DEFAULT_SETTINGS, migrateSettings(raw))
  return normalizeSettings(merged, { invalid: 'default' })
}

export function createSettingsService({ getStorageApi = () => chrome.storage, log = logger } = {}) {
  const stores = new WeakMap()
  let pending = Promise.resolve()

  function storage() {
    const api = getStorageApi() || {}
    const area = api.sync || api.local
    if (!area) throw storageError('unavailable')
    if (!stores.has(area)) stores.set(area, createSettingsStorage(area, {
      backend: api.sync ? 'sync' : 'local', local: api.local, log
    }))
    return stores.get(area)
  }

  // Reads wait for preceding mutations too, including storage.onChanged work.
  function serialize(action) {
    const result = pending.then(action)
    pending = result.catch(() => {})
    return result
  }

  function getSettingsState() {
    return serialize(async () => {
      const store = storage()
      const { raw, items, warning } = await store.read()
      const settings = loadSettings(raw)
      // Cache the legacy read too, without migrating/writing the sync backend.
      if (raw && !warning && !Object.hasOwn(items, STORAGE_KEYS.INDEX)) {
        await store.remember(await encodeSettings(settings))
      }
      return { settings, warning }
    })
  }

  function saveSettings(partialSettings) {
    return serialize(async () => {
      const store = storage()
      const { raw, items } = await store.read({ allowCached: false })
      const next = normalizeSettings(deepMerge(loadSettings(raw), partialSettings || {}))
      next.version = CURRENT_SETTINGS_VERSION
      await store.write(next, items)
      log.info('Settings saved.')
      return next
    })
  }

  function resetSettings() {
    return serialize(async () => {
      const store = storage()
      const { items } = await store.read({ allowCached: false })
      const fresh = normalizeSettings(deepMerge({}, DEFAULT_SETTINGS))
      await store.write(fresh, items)
      log.info('Settings reset to default.')
      return fresh
    })
  }

  return {
    getSettings: async () => (await getSettingsState()).settings,
    getSettingsState, saveSettings, resetSettings
  }
}

export const settingsService = createSettingsService()
