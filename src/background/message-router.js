import { MESSAGE_TYPES } from '../messaging/index.js'
import { settingsService } from '../settings/index.js'
import { logger } from '../shared/logger.js'
import { fetchFileTextViaOffscreen } from './offscreen-fetch.js'
import { sanitizeDownloadFilename } from '../shared/download.js'

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

export async function routeMessage(message, sender) {
  switch (message?.type) {
    case MESSAGE_TYPES.PING:
      // Health-check for manual/debug use; no in-repo callers today.
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

    case MESSAGE_TYPES.FETCH_FILE_AS_TEXT:
    {
      const rawUrl = message.payload?.url
      if (!rawUrl || typeof rawUrl !== 'string') {
        throw new Error('Missing url')
      }
      let parsed
      try {
        parsed = new URL(rawUrl)
      } catch {
        throw new Error('Invalid url')
      }
      if (parsed.protocol !== 'file:') {
        throw new Error('Only file: URLs are allowed')
      }
      parsed.hash = ''
      const url = parsed.href

      if (typeof chrome.extension?.isAllowedFileSchemeAccess === 'function') {
        const allowed = await chrome.extension.isAllowedFileSchemeAccess()
        if (!allowed) {
          throw new Error(
            'Enable “Allow access to file URLs” for Markdown Plus (chrome://extensions → this extension → Details).'
          )
        }
      }

      return fetchFileTextViaOffscreen(url)
    }

    case MESSAGE_TYPES.DOWNLOAD_DATA_URL:
    {
      const dataUrl = message.payload?.dataUrl
      const filename = message.payload?.filename
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        throw new Error('Invalid or missing dataUrl')
      }
      if (!filename || typeof filename !== 'string') {
        throw new Error('Missing filename')
      }
      const safeName = sanitizeDownloadFilename(filename)
      await chrome.downloads.download({
        url: dataUrl,
        filename: safeName,
        saveAs: false
      })
      return { filename: safeName }
    }

    default:
      logger.warn('Unknown message type received.', message?.type)
      throw new Error(`Unsupported message type: ${message?.type || 'undefined'}`)
  }
}
