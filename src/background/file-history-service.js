import {
  DEFAULT_HISTORY_ENABLED,
  DEFAULT_HISTORY_MAX_ENTRIES
} from '../shared/constants/history.js'
import {
  fileHistoryTitleFromUrl,
  normalizeFileHistoryUrl,
  upsertFileHistoryEntry
} from '../shared/file-history.js'
import { logger } from '../shared/logger.js'
import { settingsService } from '../settings/index.js'
import { normalizeHistorySettings } from '../settings/settings-schema.js'

export const FILE_HISTORY_STORAGE_KEY = 'mdViewer.fileHistory'

export function createFileHistoryService(dependencies = {}) {
  const historySettings = dependencies.settingsService || settingsService
  const log = dependencies.logger || logger

  function getStorageArea() {
    const storage = dependencies.storageArea || globalThis.chrome?.storage?.local
    if (!storage) throw new Error('Local file-history storage is unavailable.')
    return storage
  }

  async function getHistoryPolicy() {
    const settings = await historySettings.getSettings()
    return normalizeHistorySettings(
      {
        enabled: DEFAULT_HISTORY_ENABLED,
        maxEntries: DEFAULT_HISTORY_MAX_ENTRIES,
        ...(settings?.history || {})
      },
      { invalid: 'default' }
    )
  }

  async function readStoredHistory(storage, maxEntries) {
    const data = await storage.get(FILE_HISTORY_STORAGE_KEY)
    const rawEntries = Array.isArray(data[FILE_HISTORY_STORAGE_KEY])
      ? data[FILE_HISTORY_STORAGE_KEY]
      : []
    const validEntries = rawEntries.filter((entry) => normalizeFileHistoryUrl(entry?.url))
    const retainedEntries = validEntries.slice(0, maxEntries)

    if (retainedEntries.length !== rawEntries.length) {
      await storage.set({ [FILE_HISTORY_STORAGE_KEY]: retainedEntries })
    }

    return retainedEntries
  }

  async function getFileHistory() {
    const storage = getStorageArea()
    const policy = await getHistoryPolicy()
    return readStoredHistory(storage, policy.maxEntries)
  }

  async function recordFileOpened(payload = {}) {
    const url = normalizeFileHistoryUrl(payload.url)
    if (!url) return getFileHistory()

    const storage = getStorageArea()
    const policy = await getHistoryPolicy()
    const current = await readStoredHistory(storage, policy.maxEntries)
    if (!policy.enabled) return current

    const next = upsertFileHistoryEntry(
      current,
      {
        url,
        title: payload.title || fileHistoryTitleFromUrl(url),
        openedAt: Date.now()
      },
      policy.maxEntries
    )

    await storage.set({ [FILE_HISTORY_STORAGE_KEY]: next })

    log.debug('File history updated.')
    return next
  }

  async function clearFileHistory() {
    const storage = getStorageArea()
    await storage.set({ [FILE_HISTORY_STORAGE_KEY]: [] })
    log.info('File history cleared.')
    return []
  }

  async function openFileFromHistory(payload = {}) {
    const url = normalizeFileHistoryUrl(payload.url)
    if (!url) {
      throw new Error('Invalid file history URL')
    }

    const tabs = dependencies.tabsApi || globalThis.chrome?.tabs
    if (!tabs) throw new Error('Tabs API is unavailable.')

    await tabs.create({ url })
    await recordFileOpened({ url })
    return { url }
  }

  return {
    getFileHistory,
    recordFileOpened,
    clearFileHistory,
    openFileFromHistory
  }
}

export const fileHistoryService = createFileHistoryService()
