import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { sanitizeDownloadFilename } from '../../shared/download.js'
import { logger } from '../../shared/logger.js'
import { getFileTypeFromName, MARKDOWN_FILE_EXTENSIONS } from '../../shared/file-types.js'

export class FileMismatchError extends Error {
  constructor(expectedName, selectedName) {
    const expected = String(expectedName || 'this file').trim() || 'this file'
    const selected = String(selectedName || 'another file').trim() || 'another file'
    super(
      `The selected file (“${selected}”) is not the file you are editing (“${expected}”). Choose the original file shown in Markdown Plus.`
    )
    this.name = 'FileMismatchError'
    this.expectedName = expected
    this.selectedName = selected
  }
}

export class FileContentMismatchError extends Error {
  constructor(filename) {
    super(
      `“${filename || 'The selected file'}” does not match the document currently open in Markdown Plus. Reload the viewer if the file changed, or choose the original file.`
    )
    this.name = 'FileContentMismatchError'
  }
}

export class FileConflictError extends Error {
  constructor(filename) {
    super(
      `“${filename || 'This file'}” changed on disk after editing started. Reload it before saving so external changes are not overwritten.`
    )
    this.name = 'FileConflictError'
  }
}

export class FileNotConnectedError extends Error {
  constructor() {
    super('The original file is not connected. Exit edit mode and connect it again before saving.')
    this.name = 'FileNotConnectedError'
  }
}

const IDB_NAME = 'mdp-editor'
const IDB_VERSION = 2
const IDB_STORE = 'file-handles'

/** @type {Map<string, FileSystemFileHandle>} */
const memoryHandleCache = new Map()
/** @type {Map<string, string>} */
const lastKnownDiskContent = new Map()

export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

export function normalizeFileUrlKey(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return ''
  try {
    const url = new URL(fileUrl)
    url.hash = ''
    return url.href
  } catch {
    return String(fileUrl).trim()
  }
}

export function getLeafFilenameFromFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return ''
  if (fileUrl.startsWith(MDP_WS_FILE)) {
    try {
      const relativePath = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
      return relativePath.split('/').filter(Boolean).pop() || ''
    } catch {
      return ''
    }
  }
  try {
    const url = new URL(fileUrl)
    const leaf = url.pathname.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(leaf)
  } catch {
    return ''
  }
}

export function getDisplayPathFromFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return ''
  try {
    const url = new URL(fileUrl)
    if (url.protocol !== 'file:') return fileUrl
    const decodedPath = decodeURIComponent(url.pathname)
    const windowsPath = /^\/[a-zA-Z]:\//.test(decodedPath) ? decodedPath.slice(1) : decodedPath
    return url.hostname ? `//${url.hostname}${windowsPath}` : windowsPath
  } catch {
    return fileUrl
  }
}

function normalizeFilenameForCompare(name) {
  return String(name || '').normalize('NFC')
}

export function handleMatchesFileUrl(handle, fileUrl) {
  const expected = getLeafFilenameFromFileUrl(fileUrl)
  const selected = handle?.name
  if (!expected || !selected) return false
  return normalizeFilenameForCompare(selected) === normalizeFilenameForCompare(expected)
}

function assertHandleMatchesFileUrl(handle, fileUrl) {
  const expected = getLeafFilenameFromFileUrl(fileUrl)
  if (!expected) return
  if (!handleMatchesFileUrl(handle, fileUrl)) {
    throw new FileMismatchError(expected, handle?.name || '')
  }
}

export function getSuggestedFilenameFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return 'document.md'
  try {
    const url = new URL(fileUrl)
    const leaf = url.pathname.split('/').filter(Boolean).pop() || ''
    const decoded = decodeURIComponent(leaf)
    if (getFileTypeFromName(decoded)?.id === 'markdown') return sanitizeDownloadFilename(decoded)
    const base = decoded.replace(/\.[^.]+$/, '') || 'document'
    return `${sanitizeDownloadFilename(base)}.md`
  } catch {
    return 'document.md'
  }
}

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
      // Version 1 handles were accepted by filename only. Drop them so every
      // edit target is explicitly reconnected and content-verified once.
      if (db.objectStoreNames.contains(IDB_STORE)) db.deleteObjectStore(IDB_STORE)
      db.createObjectStore(IDB_STORE)
    }
  })
}

async function clearPersistedHandle(fileUrlKey) {
  if (!fileUrlKey) return
  memoryHandleCache.delete(fileUrlKey)
  lastKnownDiskContent.delete(fileUrlKey)
  try {
    const db = await openHandleDb()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE, 'readwrite')
      transaction.oncomplete = () => resolve(undefined)
      transaction.onerror = () => reject(transaction.error)
      transaction.objectStore(IDB_STORE).delete(fileUrlKey)
    })
    db.close()
  } catch (error) {
    logger.warn('Failed to clear persisted file handle.', error)
  }
}

async function persistHandle(key, handle) {
  if (!key) return
  try {
    const db = await openHandleDb()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE, 'readwrite')
      transaction.oncomplete = () => resolve(undefined)
      transaction.onerror = () => reject(transaction.error)
      transaction.objectStore(IDB_STORE).put(handle, key)
    })
    db.close()
  } catch (error) {
    logger.warn('Failed to persist file handle to IndexedDB.', error)
  }
}

async function restoreHandle(key) {
  if (!key) return null
  try {
    const db = await openHandleDb()
    const handle = await new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE, 'readonly')
      transaction.onerror = () => reject(transaction.error)
      const request = transaction.objectStore(IDB_STORE).get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    if (handle && typeof handle === 'object' && 'createWritable' in handle) return handle
    return null
  } catch (error) {
    logger.warn('Failed to restore file handle from IndexedDB.', error)
    return null
  }
}

export async function primePersistedEditHandle(fileUrl) {
  const fileUrlKey = normalizeFileUrlKey(fileUrl)
  if (!fileUrlKey || memoryHandleCache.has(fileUrlKey)) return
  const handle = await restoreHandle(fileUrlKey)
  if (memoryHandleCache.has(fileUrlKey)) return
  if (!handle) return
  if (!handleMatchesFileUrl(handle, fileUrl)) {
    await clearPersistedHandle(fileUrlKey)
    return
  }
  memoryHandleCache.set(fileUrlKey, handle)
}

async function ensureWritePermission(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return true
  let state = await handle.queryPermission({ mode: 'readwrite' })
  if (state === 'granted') return true
  if (typeof handle.requestPermission !== 'function') return false
  state = await handle.requestPermission({ mode: 'readwrite' })
  return state === 'granted'
}

async function readHandleText(handle) {
  const file = await handle.getFile()
  return file.text()
}

function normalizeTextForIdentity(content) {
  return String(content ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

async function validateHandleContent(handle, fileUrl, expectedContent) {
  assertHandleMatchesFileUrl(handle, fileUrl)
  const diskContent = await readHandleText(handle)
  if (normalizeTextForIdentity(diskContent) !== normalizeTextForIdentity(expectedContent)) {
    throw new FileContentMismatchError(handle?.name)
  }
  return diskContent
}

async function pickOriginalMarkdownFile() {
  try {
    const handles = await window.showOpenFilePicker({
      id: 'markdown-plus-edit-original',
      multiple: false,
      excludeAcceptAllOption: true,
      types: [
        {
          description: 'Markdown',
          accept: {
            'text/markdown': MARKDOWN_FILE_EXTENSIONS.map((extension) => `.${extension}`)
          }
        }
      ]
    })
    return handles?.[0] || null
  } catch (error) {
    if (error?.name === 'AbortError') return null
    throw error
  }
}

/**
 * Connect the existing document to a user-approved writable handle before the
 * editor is allowed to start. A restored handle is accepted only after its
 * filename and current contents match the document loaded in the viewer.
 */
export async function prepareFileForEditing(content, { fileUrl = '' } = {}) {
  if (!isFileSystemAccessSupported()) {
    throw new Error('This browser cannot connect a local file for safe editing.')
  }

  const expectedContent = typeof content === 'string' ? content : ''
  const fileUrlKey = normalizeFileUrlKey(fileUrl)
  if (!fileUrlKey) throw new FileNotConnectedError()

  let handle = memoryHandleCache.get(fileUrlKey) || null
  if (handle) {
    try {
      if (!(await ensureWritePermission(handle))) throw new Error('Write permission was not granted.')
      const diskContent = await validateHandleContent(handle, fileUrl, expectedContent)
      memoryHandleCache.set(fileUrlKey, handle)
      lastKnownDiskContent.set(fileUrlKey, diskContent)
      await persistHandle(fileUrlKey, handle)
      return { status: 'ready', reused: true, filename: handle.name }
    } catch (error) {
      logger.warn('Stored edit target could not be verified; asking the user to reconnect it.', {
        filename: handle?.name || '',
        message: error instanceof Error ? error.message : String(error)
      })
      await clearPersistedHandle(fileUrlKey)
      throw error
    }
  }

  handle = await pickOriginalMarkdownFile()
  if (!handle) return { status: 'cancelled' }

  const diskContent = await validateHandleContent(handle, fileUrl, expectedContent)
  if (!(await ensureWritePermission(handle))) {
    throw new Error('Write permission was not granted for the selected file.')
  }

  memoryHandleCache.set(fileUrlKey, handle)
  lastKnownDiskContent.set(fileUrlKey, diskContent)
  await persistHandle(fileUrlKey, handle)
  return { status: 'ready', reused: false, filename: handle.name }
}

async function writeToHandle(handle, content) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Save only through the handle explicitly connected before edit mode started.
 * This function never falls back to downloading a copy.
 */
export async function saveFile(content, { fileUrl = '' } = {}) {
  const text = typeof content === 'string' ? content : ''
  const fileUrlKey = normalizeFileUrlKey(fileUrl)
  if (!fileUrlKey) throw new FileNotConnectedError()

  const handle = memoryHandleCache.get(fileUrlKey)
  const baseline = lastKnownDiskContent.get(fileUrlKey)
  if (!handle || baseline === undefined) throw new FileNotConnectedError()

  assertHandleMatchesFileUrl(handle, fileUrl)
  if (!(await ensureWritePermission(handle))) {
    throw new Error('Write permission was not granted for the connected file.')
  }

  const currentDiskContent = await readHandleText(handle)
  if (currentDiskContent !== baseline) throw new FileConflictError(handle.name)

  await writeToHandle(handle, text)
  lastKnownDiskContent.set(fileUrlKey, text)
  memoryHandleCache.set(fileUrlKey, handle)
  await persistHandle(fileUrlKey, handle)
  return 'fsa'
}
