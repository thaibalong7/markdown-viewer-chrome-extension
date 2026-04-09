import { MESSAGE_TYPES } from '../messaging/index.js'
import { settingsService } from '../settings/index.js'
import { logger } from '../shared/logger.js'

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
      return settingsService.saveSettings(message.payload || {})

    case MESSAGE_TYPES.RESET_SETTINGS:
      return settingsService.resetSettings()

    default:
      logger.warn('Unknown message type received.', message?.type)
      throw new Error(`Unsupported message type: ${message?.type || 'undefined'}`)
  }
}
