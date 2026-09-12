import { normalizeDirectoryUrl, normalizeFileUrlForCompare } from './url-utils.js'

const KEY_ORIGINAL = 'mdp:explorer:originalFile'
const KEY_SIDEBAR_WIDTH = 'mdp:sidebar:width'
const KEY_FILES_WIDTH = 'mdp:explorer:filesWidth'
const KEY_EDITOR_SPLIT_WIDTH = 'mdp:editor:splitWidth'
const KEY_WORKSPACE_ROOT = 'mdp:explorer:workspaceRoot'
const KEY_EXPLORER_MODE = 'mdp:explorer:mode'
const KEY_EXPANDED_FOLDERS = 'mdp:explorer:expandedFolders'

/** @typedef {'sibling' | 'workspace'} ExplorerMode */

/**
 * @returns {string | null}
 */
export function getOriginalFileUrl() {
  try {
    return sessionStorage.getItem(KEY_ORIGINAL)
  } catch {
    return null
  }
}

/**
 * Sets the original file URL only if not already set (first open in this tab session).
 * @param {string} url
 */
export function setOriginalFileUrlIfUnset(url) {
  try {
    if (!url || sessionStorage.getItem(KEY_ORIGINAL)) return
    sessionStorage.setItem(KEY_ORIGINAL, url)
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string} currentUrl
 * @returns {boolean}
 */
export function isOnOriginalFile(currentUrl) {
  const original = getOriginalFileUrl()
  if (!original) return true
  return normalizeFileUrlForCompare(original) === normalizeFileUrlForCompare(currentUrl)
}

/**
 * @returns {number | null}
 */
export function getSidebarWidthPx() {
  try {
    const raw = Number(sessionStorage.getItem(KEY_SIDEBAR_WIDTH))
    if (!Number.isFinite(raw) || raw <= 0) return null
    return raw
  } catch {
    return null
  }
}

/**
 * @param {number} widthPx
 */
export function setSidebarWidthPx(widthPx) {
  try {
    const n = Number(widthPx)
    if (!Number.isFinite(n) || n <= 0) return
    sessionStorage.setItem(KEY_SIDEBAR_WIDTH, String(Math.round(n)))
  } catch {
    /* ignore */
  }
}

/**
 * @returns {number | null}
 */
export function getFilesWidthPx() {
  try {
    const raw = Number(sessionStorage.getItem(KEY_FILES_WIDTH))
    if (!Number.isFinite(raw) || raw <= 0) return null
    return raw
  } catch {
    return null
  }
}

/**
 * @param {number} widthPx
 */
export function setFilesWidthPx(widthPx) {
  try {
    const n = Number(widthPx)
    if (!Number.isFinite(n) || n <= 0) return
    sessionStorage.setItem(KEY_FILES_WIDTH, String(Math.round(n)))
  } catch {
    /* ignore */
  }
}

/**
 * @returns {number | null}
 */
export function getEditorSplitWidthPx() {
  try {
    const raw = Number(sessionStorage.getItem(KEY_EDITOR_SPLIT_WIDTH))
    if (!Number.isFinite(raw) || raw <= 0) return null
    return raw
  } catch {
    return null
  }
}

/**
 * @param {number} widthPx
 */
export function setEditorSplitWidthPx(widthPx) {
  try {
    const n = Number(widthPx)
    if (!Number.isFinite(n) || n <= 0) return
    sessionStorage.setItem(KEY_EDITOR_SPLIT_WIDTH, String(Math.round(n)))
  } catch {
    /* ignore */
  }
}

/**
 * @returns {string | null}
 */
export function getWorkspaceRootUrl() {
  try {
    return sessionStorage.getItem(KEY_WORKSPACE_ROOT)
  } catch {
    return null
  }
}

/**
 * @param {string} url - file: directory URL
 */
export function setWorkspaceRootUrl(url) {
  try {
    if (!url) return
    sessionStorage.setItem(KEY_WORKSPACE_ROOT, url)
  } catch {
    /* ignore */
  }
}

export function clearWorkspaceRootUrl() {
  try {
    sessionStorage.removeItem(KEY_WORKSPACE_ROOT)
  } catch {
    /* ignore */
  }
}

/**
 * @returns {ExplorerMode}
 */
export function getExplorerMode() {
  try {
    const v = sessionStorage.getItem(KEY_EXPLORER_MODE)
    if (v === 'workspace') return 'workspace'
    return 'sibling'
  } catch {
    return 'sibling'
  }
}

/**
 * @param {ExplorerMode} mode
 */
export function setExplorerMode(mode) {
  try {
    sessionStorage.setItem(KEY_EXPLORER_MODE, mode === 'workspace' ? 'workspace' : 'sibling')
  } catch {
    /* ignore */
  }
}

function expandedFoldersStorageKey(mode, rootUrl) {
  return `${mode === 'workspace' ? 'workspace' : 'sibling'}:${String(rootUrl || '')}`
}

/**
 * @param {{ href?: string } | null | undefined} tree
 * @param {string | null | undefined} fallbackRootUrl
 * @returns {string}
 */
export function getExplorerExpandedStateRoot(tree, fallbackRootUrl = '') {
  const href = typeof tree?.href === 'string' ? tree.href : ''
  try {
    return href ? normalizeDirectoryUrl(href) : fallbackRootUrl || ''
  } catch {
    return href || fallbackRootUrl || ''
  }
}

function readExpandedFoldersRecord() {
  try {
    const raw = sessionStorage.getItem(KEY_EXPANDED_FOLDERS)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * @param {ExplorerMode} mode
 * @param {string | null | undefined} rootUrl
 * @returns {Map<string, boolean> | null}
 */
export function getExplorerExpandedMap(mode, rootUrl) {
  const entries = readExpandedFoldersRecord()[expandedFoldersStorageKey(mode, rootUrl)]
  if (!Array.isArray(entries)) return null

  const map = new Map()
  for (const entry of entries) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue
    map.set(entry[0], entry[1] === true)
  }
  return map.size ? map : null
}

/**
 * @param {ExplorerMode} mode
 * @param {string | null | undefined} rootUrl
 * @param {Map<string, boolean>} expandedMap
 */
export function setExplorerExpandedMap(mode, rootUrl, expandedMap) {
  if (!rootUrl || !(expandedMap instanceof Map)) return
  try {
    const record = readExpandedFoldersRecord()
    record[expandedFoldersStorageKey(mode, rootUrl)] = Array.from(expandedMap.entries()).filter(
      ([href]) => typeof href === 'string' && href
    )
    sessionStorage.setItem(KEY_EXPANDED_FOLDERS, JSON.stringify(record))
  } catch {
    /* ignore */
  }
}
