export const MESSAGE_TYPES = {
  PING: 'PING',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  /** Background fetches file: URLs (content scripts on file pages cannot; origin is opaque). */
  FETCH_FILE_AS_TEXT: 'FETCH_FILE_AS_TEXT',
  /**
   * Save bytes via `chrome.downloads` (required on `file:` where `<a download>` + blob is blocked).
   * Payload: `{ dataUrl: string, filename: string }` — `dataUrl` must start with `data:`.
   */
  DOWNLOAD_DATA_URL: 'DOWNLOAD_DATA_URL',
  /** Service worker forwards to the offscreen document; not routed through `routeMessage`. */
  OFFSCREEN_FETCH: 'MDP_OFFSCREEN_FETCH',
  /** Reply from offscreen → caller waiting in `fetchFileTextViaOffscreen`. */
  OFFSCREEN_FETCH_DONE: 'MDP_OFFSCREEN_FETCH_DONE'
}

export async function sendMessage(message) {
  return chrome.runtime.sendMessage(message)
}
