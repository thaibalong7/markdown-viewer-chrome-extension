import { MESSAGE_TYPES } from '../messaging/index.js'
import { logger } from '../shared/logger.js'
import { routeMessage } from './message-router.js'

const MESSAGE_TYPES_SKIP_SERVICE_ROUTING = new Set([
  MESSAGE_TYPES.OFFSCREEN_FETCH,
  MESSAGE_TYPES.OFFSCREEN_FETCH_DONE
])

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Background service worker installed.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (MESSAGE_TYPES_SKIP_SERVICE_ROUTING.has(message?.type)) {
    return false
  }

  Promise.resolve(routeMessage(message, sender))
    .then((result) => sendResponse({ ok: true, data: result }))
    .catch((error) => {
      const normalizedError = error instanceof Error ? error.message : String(error)
      logger.error('Failed to handle runtime message.', normalizedError)
      sendResponse({ ok: false, error: normalizedError })
    })

  return true
})
