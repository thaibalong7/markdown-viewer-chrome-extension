import { MESSAGE_TYPES } from '../messaging/index.js'
import { logger } from '../shared/logger.js'

const OFFSCREEN_PATH = 'offscreen.html'

let offscreenReady = null

async function hasOffscreenDocument() {
  if (typeof chrome.offscreen?.hasDocument === 'function') {
    return chrome.offscreen.hasDocument()
  }
  return false
}

async function ensureOffscreenDocument() {
  if (typeof chrome.offscreen?.createDocument !== 'function') {
    throw new Error('chrome.offscreen is not available (Chrome 109+ required).')
  }

  if (await hasOffscreenDocument()) {
    return
  }

  if (offscreenReady) {
    await offscreenReady
    if (await hasOffscreenDocument()) return
  }

  const url = chrome.runtime.getURL(OFFSCREEN_PATH)

  offscreenReady = chrome.offscreen
    .createDocument({
      url,
      reasons: ['DOM_SCRAPING'],
      justification:
        'Fetch local file:// directory listings for the Markdown Plus sibling files explorer.'
    })
    .then(() => undefined)
    .finally(() => {
      offscreenReady = null
    })

  try {
    await offscreenReady
  } catch (error) {
    const msg = String(error?.message || error)
    if (msg.includes('Only a single offscreen document')) {
      return
    }
    logger.warn('Offscreen document creation failed.', error)
    throw error
  }
}

/**
 * @param {string} url - file: URL (no hash)
 * @returns {Promise<{ text: string }>}
 */
export function fetchFileTextViaOffscreen(url) {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        await ensureOffscreenDocument()
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
        return
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      const timeoutMs = 30000
      const timeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(onDone)
        reject(new Error('Offscreen fetch timed out'))
      }, timeoutMs)

      function onDone(message) {
        if (message?.type !== MESSAGE_TYPES.OFFSCREEN_FETCH_DONE || message.id !== id) return
        chrome.runtime.onMessage.removeListener(onDone)
        clearTimeout(timeout)
        if (message.ok) {
          resolve({ text: message.text ?? '' })
        } else {
          reject(new Error(message.error || 'Fetch failed'))
        }
      }

      chrome.runtime.onMessage.addListener(onDone)

      try {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.OFFSCREEN_FETCH,
          id,
          url
        })
      } catch (e) {
        chrome.runtime.onMessage.removeListener(onDone)
        clearTimeout(timeout)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })()
  })
}
