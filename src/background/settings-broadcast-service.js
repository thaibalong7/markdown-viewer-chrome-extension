import { MESSAGE_TYPES } from '../messaging/index.js'

function normalizeTabs(tabs) {
  return Array.isArray(tabs) ? tabs.filter((tab) => tab?.id) : []
}

export async function broadcastSettingsUpdated(settings, options = {}) {
  const tabsApi = options.tabsApi || chrome.tabs
  const tabs = normalizeTabs(await tabsApi.query({}))

  await Promise.all(
    tabs.map(async (tab) => {
      try {
        await tabsApi.sendMessage(tab.id, {
          type: MESSAGE_TYPES.SETTINGS_UPDATED,
          payload: settings
        })
      } catch (_error) {
        // Tabs without the content script or unsupported URL schemes are expected.
      }
    })
  )

  return { attempted: tabs.length }
}

export const settingsBroadcastService = {
  broadcastSettingsUpdated
}
