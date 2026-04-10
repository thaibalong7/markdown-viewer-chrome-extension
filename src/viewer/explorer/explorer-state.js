const KEY_ORIGINAL = 'mdp:explorer:originalFile'
const KEY_ACTIVE_TAB = 'mdp:explorer:activeTab'

/** @typedef {'files' | 'outline'} ExplorerTabId */

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

export function clearOriginalFileUrl() {
  try {
    sessionStorage.removeItem(KEY_ORIGINAL)
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} currentUrl
 * @returns {boolean}
 */
export function isOnOriginalFile(currentUrl) {
  const original = getOriginalFileUrl()
  if (!original) return true
  return normalizeForCompare(original) === normalizeForCompare(currentUrl)
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
 * @param {string} url
 * @returns {string}
 */
function normalizeForCompare(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'file:') return url
    let p = u.pathname
    if (p.endsWith('/')) p = p.slice(0, -1)
    return `${u.protocol}//${u.host}${p}`
  } catch {
    return url
  }
}
