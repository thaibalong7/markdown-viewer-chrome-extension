import { MESSAGE_TYPES } from '../messaging/index.js'
import { settingsService } from '../settings/index.js'
import { logger } from '../shared/logger.js'

async function notifySettingsUpdated(settings) {
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab?.id) return
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.SETTINGS_UPDATED,
          payload: settings
        })
      } catch (_error) {
        // Ignore tabs without content script or unsupported URL schemes.
      }
    })
  )
}

export async function routeMessage(message, _sender) {
  switch (message?.type) {
    case MESSAGE_TYPES.PING:
      return {
        pong: true,
        timestamp: Date.now()
      }

    case MESSAGE_TYPES.GET_SETTINGS:
      return settingsService.getSettings()

    case MESSAGE_TYPES.SAVE_SETTINGS:
    {
      const nextSettings = await settingsService.saveSettings(message.payload || {})
      await notifySettingsUpdated(nextSettings)
      return nextSettings
    }

    case MESSAGE_TYPES.RESET_SETTINGS:
    {
      const nextSettings = await settingsService.resetSettings()
      await notifySettingsUpdated(nextSettings)
      return nextSettings
    }

    default:
      logger.warn('Unknown message type received.', message?.type)
      throw new Error(`Unsupported message type: ${message?.type || 'undefined'}`)
  }
}
