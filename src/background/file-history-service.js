import {
  MAX_FILE_HISTORY_ENTRIES,
  fileHistoryTitleFromUrl,
  normalizeFileHistoryUrl,
  upsertFileHistoryEntry
} from '../shared/file-history.js'
import { logger } from '../shared/logger.js'

const STORAGE_KEYS = {
  FILE_HISTORY: 'mdViewer.fileHistory'
}

function getStorageArea() {
  return chrome.storage.local || chrome.storage.sync
}

async function getFileHistory() {
  const storage = getStorageArea()
  const data = await storage.get(STORAGE_KEYS.FILE_HISTORY)
  const rawEntries = Array.isArray(data[STORAGE_KEYS.FILE_HISTORY])
    ? data[STORAGE_KEYS.FILE_HISTORY]
    : []

  return rawEntries
    .filter((entry) => normalizeFileHistoryUrl(entry?.url))
    .slice(0, MAX_FILE_HISTORY_ENTRIES)
}

async function recordFileOpened(payload = {}) {
  const url = normalizeFileHistoryUrl(payload.url)
  if (!url) return getFileHistory()

  const storage = getStorageArea()
  const current = await getFileHistory()
  const next = upsertFileHistoryEntry(current, {
    url,
    title: payload.title || fileHistoryTitleFromUrl(url),
    openedAt: Date.now()
  })

  await storage.set({
    [STORAGE_KEYS.FILE_HISTORY]: next
  })

  logger.debug('File history updated.', url)
  return next
}

async function clearFileHistory() {
  const storage = getStorageArea()
  await storage.set({
    [STORAGE_KEYS.FILE_HISTORY]: []
  })
  logger.info('File history cleared.')
  return []
}

async function openFileFromHistory(payload = {}) {
  const url = normalizeFileHistoryUrl(payload.url)
  if (!url) {
    throw new Error('Invalid file history URL')
  }

  await chrome.tabs.create({ url })
  await recordFileOpened({ url })
  return { url }
}

export const fileHistoryService = {
  getFileHistory,
  recordFileOpened,
  clearFileHistory,
  openFileFromHistory
}
