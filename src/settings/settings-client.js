import { setLanguage } from '../i18n/index.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { setSettingsStorageWarning } from './settings-storage-status.js'

async function requestSettings(message, failureMessage) {
  const response = await sendMessage(message)
  if (!response?.ok) {
    throw new Error(response?.error || failureMessage)
  }
  const hasStatus = message.includeStorageStatus && response.data?.settings
  const data = hasStatus ? response.data.settings : response.data
  setSettingsStorageWarning(hasStatus ? response.data.warning : null)
  setLanguage(data?.language)
  return data
}

export function getSettings() {
  return requestSettings({ type: MESSAGE_TYPES.GET_SETTINGS, includeStorageStatus: true }, 'Failed to load settings.')
}

export function saveSettings(partialSettings) {
  return requestSettings(
    {
      type: MESSAGE_TYPES.SAVE_SETTINGS,
      payload: partialSettings
    },
    'Failed to save settings.'
  )
}

export function resetSettings() {
  return requestSettings({ type: MESSAGE_TYPES.RESET_SETTINGS }, 'Failed to reset settings.')
}
