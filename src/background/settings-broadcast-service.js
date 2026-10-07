import { MESSAGE_TYPES } from '../messaging/index.js'

function normalizeTabs(tabs) {
  return Array.isArray(tabs) ? tabs.filter((tab) => tab?.id) : []
}

export async function broadcastSettingsUpdated(settings, options = {}) {
  const tabsApi = options.tabsApi || chrome.tabs
  const runtimeApi = options.runtimeApi || chrome.runtime
  const tabs = normalizeTabs(await tabsApi.query({}))

  for (const tab of tabs) {
    try {
      // This is a notification: saving must not wait for a tab's response.
      tabsApi.sendMessage(tab.id, {
        type: MESSAGE_TYPES.SETTINGS_UPDATED,
        payload: settings
      }, () => {
        // Consume expected delivery errors from tabs without a content script.
        void runtimeApi.lastError
      })
    } catch (_error) {
      // Tabs without the content script or unsupported URL schemes are expected.
    }
  }

  return { attempted: tabs.length }
}

export const settingsBroadcastService = {
  broadcastSettingsUpdated
}
