import { normalizeFileUrlForCompare } from './sibling-scanner.js'

const KEY_ORIGINAL = 'mdp:explorer:originalFile'
const KEY_ACTIVE_TAB = 'mdp:explorer:activeTab'
const KEY_SIDEBAR_WIDTH = 'mdp:sidebar:width'
const KEY_WORKSPACE_ROOT = 'mdp:explorer:workspaceRoot'
const KEY_EXPLORER_MODE = 'mdp:explorer:mode'

/** @typedef {'files' | 'outline'} ExplorerTabId */
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
 * @returns {ExplorerTabId}
 */
export function getActiveSidebarTab() {
  try {
    const v = sessionStorage.getItem(KEY_ACTIVE_TAB)
    if (v === 'files') return 'files'
    return 'outline'
  } catch {
    return 'outline'
  }
}

/**
 * @param {ExplorerTabId} tabId
 */
export function setActiveSidebarTab(tabId) {
  try {
    sessionStorage.setItem(KEY_ACTIVE_TAB, tabId)
  } catch {
    /* ignore */
  }
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
