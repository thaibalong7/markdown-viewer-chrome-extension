import { STORAGE_KEYS, isThemeRecordKey } from '../settings/settings-storage-format.js'
import { settingsService } from '../settings/settings-service.js'
import { settingsBroadcastService } from './settings-broadcast-service.js'
import { logger } from '../shared/logger.js'

export function observeSettingsStorage({
  storage = chrome.storage, settings = settingsService,
  broadcaster = settingsBroadcastService, log = logger, delay = 50
} = {}) {
  let timer = null
  let disposed = false
  const receive = (changes, areaName) => {
    const selectedArea = storage.sync ? 'sync' : 'local'
    if (areaName !== selectedArea || !Object.keys(changes).some(key =>
      key === STORAGE_KEYS.INDEX || key === STORAGE_KEYS.SETTINGS || isThemeRecordKey(key))) return
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const { settings: snapshot, warning } = await settings.getSettingsState()
        if (!disposed) await broadcaster.broadcastSettingsUpdated(snapshot, { warning })
      } catch (error) {
        // Missing refs on a fresh profile must not publish/save defaults.
        log.warn('Could not reconcile synchronized settings.', error)
      }
    }, delay)
  }
  storage.onChanged.addListener(receive)
  return () => {
    disposed = true
    clearTimeout(timer)
    storage.onChanged.removeListener(receive)
  }
}
