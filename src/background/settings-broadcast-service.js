import { MESSAGE_TYPES } from '../messaging/index.js'
import { logger } from '../shared/logger.js'
import { canonicalJson } from '../settings/settings-storage-format.js'

const published = new WeakMap()

function normalizeTabs(tabs) {
  return Array.isArray(tabs) ? tabs.filter((tab) => tab?.id) : []
}

export function broadcastSettingsUpdated(settings, options = {}) {
  const runtimeApi = options.runtimeApi || chrome.runtime
  const message = {
    type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: settings,
    ...(options.warning ? { storageWarning: options.warning } : {})
  }
  if (!published.has(runtimeApi)) published.set(runtimeApi, { pending: Promise.resolve(), fingerprint: null })
  const state = published.get(runtimeApi)
  // Keep dispatch order aligned with persistence order even when tabs.query()
  // for an earlier snapshot takes longer than a later notification.
  const result = state.pending.then(() => dispatchSettingsUpdated(message, options, runtimeApi, state))
  state.pending = result.catch(() => {})
  return result
}

async function dispatchSettingsUpdated(message, options, runtimeApi, state) {
  const tabsApi = options.tabsApi || chrome.tabs
  const fingerprint = canonicalJson(message)
  if (state.fingerprint === fingerprint) return { attempted: 0 }
  let discoverySucceeded = true
  let tabs = []
  try {
    tabs = normalizeTabs(await tabsApi.query({}))
  } catch (error) {
    logger.warn('Could not find viewer tabs for settings notification.', error)
    // Allow a subsequent notification to retry tab discovery.
    discoverySucceeded = false
  }

  for (const tab of tabs) {
    try {
      // This is a notification: saving must not wait for a tab's response.
      tabsApi.sendMessage(tab.id, message, () => {
        // Consume expected delivery errors from tabs without a content script.
        void runtimeApi.lastError
      })
    } catch (_error) {
      // Tabs without the content script or unsupported URL schemes are expected.
    }
  }

  // Notify Popup/Options too; a closed extension page is an expected missing receiver.
  try {
    runtimeApi.sendMessage?.(message, () => {
      void runtimeApi.lastError
    })
  } catch (_error) { /* No extension-page receiver is open. */ }

  state.fingerprint = discoverySucceeded ? fingerprint : null
  return { attempted: tabs.length }
}

export const settingsBroadcastService = {
  broadcastSettingsUpdated
}
