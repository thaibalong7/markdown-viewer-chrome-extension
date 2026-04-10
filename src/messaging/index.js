export const MESSAGE_TYPES = {
  PING: 'PING',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  /** Background fetches file: URLs (content scripts on file pages cannot; origin is opaque). */
  FETCH_FILE_AS_TEXT: 'FETCH_FILE_AS_TEXT'
}

export async function sendMessage(message) {
  return chrome.runtime.sendMessage(message)
}
