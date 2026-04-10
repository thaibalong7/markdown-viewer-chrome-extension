export const MESSAGE_TYPES = {
  PING: 'PING',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED'
}

export async function sendMessage(message) {
  return chrome.runtime.sendMessage(message)
}
