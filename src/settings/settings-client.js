import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'

async function requestSettings(message, failureMessage) {
  const response = await sendMessage(message)
  if (!response?.ok) {
    throw new Error(response?.error || failureMessage)
  }
  return response.data
}

export function getSettings() {
  return requestSettings({ type: MESSAGE_TYPES.GET_SETTINGS }, 'Failed to load settings.')
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
