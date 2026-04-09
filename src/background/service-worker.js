import { logger } from '../shared/logger.js'
import { routeMessage } from './message-router.js'

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Background service worker installed.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Promise.resolve(routeMessage(message, sender))
    .then((result) => sendResponse({ ok: true, data: result }))
    .catch((error) => {
      const normalizedError = error instanceof Error ? error.message : String(error)
      logger.error('Failed to handle runtime message.', normalizedError)
      sendResponse({ ok: false, error: normalizedError })
    })

  return true
})
