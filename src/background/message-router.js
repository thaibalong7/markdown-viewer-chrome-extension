import { MESSAGE_TYPES } from '../messaging/index.js'
import { settingsService } from '../settings/index.js'
import { logger } from '../shared/logger.js'
import { fetchFileTextViaOffscreen } from './offscreen-fetch.js'
import { sanitizeDownloadFilename } from '../shared/download.js'
import { fileHistoryService } from './file-history-service.js'
import { settingsBroadcastService } from './settings-broadcast-service.js'

function createPingResponse() {
  return {
    pong: true,
    timestamp: Date.now()
  }
}

function normalizeFileFetchUrl(payload = {}) {
  const rawUrl = payload.url
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
  return parsed.href
}

async function assertFileSchemeAccess(extensionApi = chrome.extension) {
  if (typeof extensionApi?.isAllowedFileSchemeAccess !== 'function') return

  const allowed = await extensionApi.isAllowedFileSchemeAccess()
  if (!allowed) {
    throw new Error(
      'Enable “Allow access to file URLs” for Markdown Plus (chrome://extensions → this extension → Details).'
    )
  }
}

function getExtensionApi(override) {
  return override || chrome.extension
}

function getDownloadsApi(override) {
  return override || chrome.downloads
}

function validateDownloadPayload(payload = {}) {
  const dataUrl = payload.dataUrl
  const filename = payload.filename
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid or missing dataUrl')
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Missing filename')
  }
  return { dataUrl, filename: sanitizeDownloadFilename(filename) }
}

export function createMessageRouter(dependencies = {}) {
  const services = {
    settings: dependencies.settingsService || settingsService,
    settingsBroadcast: dependencies.settingsBroadcastService || settingsBroadcastService,
    fileHistory: dependencies.fileHistoryService || fileHistoryService,
    fetchFileText: dependencies.fetchFileTextViaOffscreen || fetchFileTextViaOffscreen,
    downloadsApi: dependencies.downloadsApi,
    extensionApi: dependencies.extensionApi,
    log: dependencies.logger || logger
  }

  const routes = {
    [MESSAGE_TYPES.PING]: () => createPingResponse(),
    [MESSAGE_TYPES.GET_SETTINGS]: () => services.settings.getSettings(),
    [MESSAGE_TYPES.SAVE_SETTINGS]: async (message) => {
      const nextSettings = await services.settings.saveSettings(message.payload || {})
      await services.settingsBroadcast.broadcastSettingsUpdated(nextSettings)
      return nextSettings
    },
    [MESSAGE_TYPES.RESET_SETTINGS]: async () => {
      const nextSettings = await services.settings.resetSettings()
      await services.settingsBroadcast.broadcastSettingsUpdated(nextSettings)
      return nextSettings
    },
    [MESSAGE_TYPES.GET_FILE_HISTORY]: () => services.fileHistory.getFileHistory(),
    [MESSAGE_TYPES.RECORD_FILE_OPENED]: (message) => (
      services.fileHistory.recordFileOpened(message.payload || {})
    ),
    [MESSAGE_TYPES.CLEAR_FILE_HISTORY]: () => services.fileHistory.clearFileHistory(),
    [MESSAGE_TYPES.OPEN_FILE_FROM_HISTORY]: (message) => (
      services.fileHistory.openFileFromHistory(message.payload || {})
    ),
    [MESSAGE_TYPES.FETCH_FILE_AS_TEXT]: async (message) => {
      const url = normalizeFileFetchUrl(message.payload)
      await assertFileSchemeAccess(getExtensionApi(services.extensionApi))
      return services.fetchFileText(url)
    },
    [MESSAGE_TYPES.DOWNLOAD_DATA_URL]: async (message) => {
      const { dataUrl, filename } = validateDownloadPayload(message.payload)
      await getDownloadsApi(services.downloadsApi).download({
        url: dataUrl,
        filename,
        saveAs: false
      })
      return { filename }
    }
  }

  return async function routeMessage(message, sender) {
    const route = routes[message?.type]
    if (!route) {
      services.log.warn('Unknown message type received.', message?.type)
      throw new Error(`Unsupported message type: ${message?.type || 'undefined'}`)
    }
    return route(message, sender)
  }
}

export const routeMessage = createMessageRouter()
