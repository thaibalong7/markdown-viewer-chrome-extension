import { sanitizeDownloadFilename, triggerDownload } from '../../shared/download.js'
import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { logger } from '../../shared/logger.js'

export class FileMismatchError extends Error {
  /**
   * @param {string} expectedName
   * @param {string} selectedName
   */
  constructor(expectedName, selectedName) {
    const expected = String(expectedName || 'this file').trim() || 'this file'
    const selected = String(selectedName || 'another file').trim() || 'another file'
    super(
      `The selected file (“${selected}”) is not the file you are editing (“${expected}”). Choose the correct file to save.`
    )
    this.name = 'FileMismatchError'
    this.expectedName = expected
    this.selectedName = selected
  }
}

const IDB_NAME = 'mdp-editor'
const IDB_VERSION = 1
const IDB_STORE = 'file-handles'

/** @type {Map<string, FileSystemFileHandle>} */
const memoryHandleCache = new Map()

/**
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'
}

/**
 * @param {string | null | undefined} fileUrl
 * @returns {string}
 */
export function normalizeFileUrlKey(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return ''
  try {
    const u = new URL(fileUrl)
    u.hash = ''
    return u.href
  } catch {
    return String(fileUrl).trim()
  }
}

/**
 * @param {string | null | undefined} fileUrl
 * @returns {string}
 */
/**
 * Leaf filename from the page / document URL (for matching picker selection).
 * @param {string | null | undefined} fileUrl
 * @returns {string}
 */
export function getLeafFilenameFromFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return ''
  if (fileUrl.startsWith(MDP_WS_FILE)) {
    try {
      const rel = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
      return rel.split('/').filter(Boolean).pop() || ''
    } catch {
      return ''
    }
  }
  try {
    const u = new URL(fileUrl)
    const leaf = u.pathname.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(leaf)
  } catch {
    return ''
  }
}

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeFilenameForCompare(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
}

/**
 * @param {FileSystemFileHandle} handle
 * @param {string | null | undefined} fileUrl
 * @returns {boolean}
 */
export function handleMatchesFileUrl(handle, fileUrl) {
  const expected = getLeafFilenameFromFileUrl(fileUrl)
  const selected = handle?.name
  if (!expected || !selected) return false
  return normalizeFilenameForCompare(selected) === normalizeFilenameForCompare(expected)
}

/**
 * @param {FileSystemFileHandle} handle
 * @param {string | null | undefined} fileUrl
 */
function assertHandleMatchesFileUrl(handle, fileUrl) {
  const expected = getLeafFilenameFromFileUrl(fileUrl)
  if (!expected) return
  if (!handleMatchesFileUrl(handle, fileUrl)) {
    throw new FileMismatchError(expected, handle?.name || '')
  }
}

/**
 * @param {string} fileUrlKey
 */
async function clearPersistedHandle(fileUrlKey) {
  if (!fileUrlKey) return
  memoryHandleCache.delete(fileUrlKey)
  try {
    const db = await openHandleDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.oncomplete = () => resolve(undefined)
      tx.onerror = () => reject(tx.error)
      tx.objectStore(IDB_STORE).delete(fileUrlKey)
    })
    db.close()
  } catch (err) {
    logger.warn('Failed to clear persisted file handle.', err)
  }
}

export function getSuggestedFilenameFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return 'document.md'
  try {
    const u = new URL(fileUrl)
    const leaf = u.pathname.split('/').filter(Boolean).pop() || ''
    const decoded = decodeURIComponent(leaf)
    if (/\.(md|markdown|mdown)$/i.test(decoded)) {
      return sanitizeDownloadFilename(decoded)
    }
    const base = decoded.replace(/\.[^.]+$/, '') || 'document'
    return `${sanitizeDownloadFilename(base)}.md`
  } catch {
    return 'document.md'
  }
}

/**
 * @returns {Promise<IDBDatabase>}
 */
function openHandleDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = /** @type {IDBOpenDBRequest} */ (event.target).result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
  })
}

/**
 * @param {string} key
 * @param {FileSystemFileHandle} handle
 */
async function persistHandle(key, handle) {
  if (!key) return
  try {
    const db = await openHandleDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.oncomplete = () => resolve(undefined)
      tx.onerror = () => reject(tx.error)
      tx.objectStore(IDB_STORE).put(handle, key)
    })
    db.close()
  } catch (err) {
    logger.warn('Failed to persist file handle to IndexedDB.', err)
  }
}

/**
 * @param {string} key
 * @returns {Promise<FileSystemFileHandle | null>}
 */
async function restoreHandle(key) {
  if (!key) return null
  try {
    const db = await openHandleDb()
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      tx.onerror = () => reject(tx.error)
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (handle && typeof handle === 'object' && 'createWritable' in handle) {
      return /** @type {FileSystemFileHandle} */ (handle)
    }
    return null
  } catch (err) {
    logger.warn('Failed to restore file handle from IndexedDB.', err)
    return null
  }
}

/**
 * @param {FileSystemFileHandle} handle
 * @returns {Promise<boolean>}
 */
async function ensureWritePermission(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return true
  let state = await handle.queryPermission({ mode: 'readwrite' })
  if (state === 'granted') return true
  if (typeof handle.requestPermission !== 'function') return false
  state = await handle.requestPermission({ mode: 'readwrite' })
  return state === 'granted'
}

/**
 * @param {FileSystemFileHandle} handle
 * @param {string} content
 */
async function writeToHandle(handle, content) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * @param {string} content
 * @param {string} suggestedName
 * @param {string} fileUrlKey
 * @param {string} fileUrl
 * @returns {Promise<'fsa' | 'cancelled'>}
 */
export async function saveWithFileSystemAccess(content, suggestedName, fileUrlKey, fileUrl) {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported')
  }

  let handle =
    (fileUrlKey && memoryHandleCache.get(fileUrlKey)) ||
    (fileUrlKey ? await restoreHandle(fileUrlKey) : null)

  if (handle && !handleMatchesFileUrl(handle, fileUrl)) {
    logger.warn('Cached file handle does not match the document being edited; clearing cache.')
    await clearPersistedHandle(fileUrlKey)
    handle = null
  }

  if (handle) {
    const allowed = await ensureWritePermission(handle)
    if (allowed) {
      try {
        assertHandleMatchesFileUrl(handle, fileUrl)
        await writeToHandle(handle, content)
        if (fileUrlKey) {
          memoryHandleCache.set(fileUrlKey, handle)
          await persistHandle(fileUrlKey, handle)
        }
        return 'fsa'
      } catch (err) {
        if (err instanceof FileMismatchError) {
          await clearPersistedHandle(fileUrlKey)
          throw err
        }
        logger.warn('Failed to write with cached handle; opening picker.', err)
        handle = null
      }
    } else {
      handle = null
    }
  }

  try {
    handle = await window.showSaveFilePicker({
      suggestedName: suggestedName || 'document.md',
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] }
        }
      ]
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      return 'cancelled'
    }
    throw err
  }

  assertHandleMatchesFileUrl(handle, fileUrl)

  const allowed = await ensureWritePermission(handle)
  if (!allowed) {
    throw new Error('Write permission denied for the selected file.')
  }

  await writeToHandle(handle, content)
  if (fileUrlKey) {
    memoryHandleCache.set(fileUrlKey, handle)
    await persistHandle(fileUrlKey, handle)
  }
  return 'fsa'
}

/**
 * @param {string} content
 * @param {string} filename
 */
export async function saveViaDownload(content, filename) {
  const safeName = sanitizeDownloadFilename(filename || 'document.md')
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  await triggerDownload({ blob, filename: safeName })
}

/**
 * @param {string} content
 * @param {{ fileUrl?: string, suggestedName?: string }} [options]
 * @returns {Promise<'fsa' | 'download' | 'cancelled'>}
 */
export async function saveFile(content, options = {}) {
  const text = typeof content === 'string' ? content : ''
  const fileUrl = options.fileUrl || ''
  const fileUrlKey = normalizeFileUrlKey(fileUrl)
  const suggestedName =
    options.suggestedName || getSuggestedFilenameFromUrl(fileUrl) || 'document.md'

  if (isFileSystemAccessSupported()) {
    try {
      const result = await saveWithFileSystemAccess(text, suggestedName, fileUrlKey, fileUrl)
      if (result === 'cancelled') return 'cancelled'
      return 'fsa'
    } catch (err) {
      if (err instanceof FileMismatchError) {
        throw err
      }
      if (err?.name === 'AbortError') return 'cancelled'
      logger.warn('File System Access save failed; falling back to download.', err)
    }
  }

  await saveViaDownload(text, suggestedName)
  return 'download'
}
