import { MDP_WS_DIR, MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { MARKDOWN_PATHNAME_EXT_RE } from '../../shared/markdown-detect.js'

/** Markdown file extensions for URL pathname checks (alias of `MARKDOWN_PATHNAME_EXT_RE`). */
export const MARKDOWN_EXT = MARKDOWN_PATHNAME_EXT_RE

/** Re-export workspace virtual URL prefixes (source: `shared/constants/explorer.js`). */
export { MDP_WS_DIR, MDP_WS_FILE }

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isWorkspaceVirtualHref(href) {
  return typeof href === 'string' && (href.startsWith(MDP_WS_FILE) || href.startsWith(MDP_WS_DIR))
}

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isMarkdownFileHref(href) {
  if (!href || href === '/' || href.endsWith('/')) return false
  try {
    const u = new URL(href)
    if (u.protocol !== 'file:') return false
    return MARKDOWN_EXT.test(u.pathname)
  } catch {
    return false
  }
}

/**
 * @param {string} fileUrl
 * @returns {string | null}
 */
export function getParentDirectoryUrl(fileUrl) {
  try {
    const u = new URL(fileUrl)
    u.hash = ''
    if (u.protocol !== 'file:') return null
    let path = u.pathname
    if (path.endsWith('/')) path = path.slice(0, -1)
    const idx = path.lastIndexOf('/')
    if (idx < 0) return null
    u.pathname = path.slice(0, idx + 1)
    return u.href
  } catch {
    return null
  }
}

/**
 * Human-readable absolute directory path for the parent of a file: URL (for path input prefill).
 * @param {string} fileUrl
 * @returns {string}
 */
export function getParentDirectoryPathLabel(fileUrl) {
  const dirUrl = getParentDirectoryUrl(fileUrl)
  if (!dirUrl) return ''
  try {
    const u = new URL(dirUrl)
    let p = u.pathname
    if (p.endsWith('/')) p = p.slice(0, -1)
    try {
      return decodeURIComponent(p)
    } catch {
      return p
    }
  } catch {
    return ''
  }
}

/**
 * Normalize a directory file: URL to always end with a trailing slash on pathname.
 * @param {string} href
 * @returns {string}
 */
export function normalizeDirectoryUrl(href) {
  try {
    const u = new URL(href)
    if (u.protocol !== 'file:') return href
    let p = u.pathname
    if (!p.endsWith('/')) u.pathname = `${p}/`
    return u.href
  } catch {
    return href
  }
}

/**
 * True when fileUrl is a file: URL for a file (not a directory) whose path lies inside dirUrl (file: directory, trailing slash optional).
 * @param {string} fileUrl
 * @param {string} dirUrl
 * @returns {boolean}
 */
export function fileUrlIsUnderDirectoryUrl(fileUrl, dirUrl) {
  if (typeof fileUrl !== 'string' || typeof dirUrl !== 'string') return false
  if (!fileUrl.startsWith('file:') || !dirUrl.startsWith('file:')) return false
  try {
    const fu = new URL(fileUrl)
    if (fu.pathname.endsWith('/')) return false
    const du = new URL(normalizeDirectoryUrl(dirUrl))
    let dp = du.pathname
    if (!dp.endsWith('/')) dp += '/'
    return fu.pathname === dp.slice(0, -1) || fu.pathname.startsWith(dp)
  } catch {
    return false
  }
}

/**
 * Compare file URLs ignoring trivial differences (trailing slash, encoding quirks).
 * @param {string} url
 * @returns {string}
 */
export function normalizeFileUrlForCompare(url) {
  if (isWorkspaceVirtualHref(url)) return url
  try {
    const u = new URL(url)
    u.hash = ''
    if (u.protocol !== 'file:') return url
    let p = u.pathname
    if (p.endsWith('/')) p = p.slice(0, -1)
    return `${u.protocol}//${u.host}${p}`
  } catch {
    return url
  }
}

/**
 * Build readable document title from file or virtual workspace URL.
 * @param {string} fileUrl
 * @returns {string}
 */
export function markdownFileTitleFromUrl(fileUrl) {
  if (typeof fileUrl === 'string' && fileUrl.startsWith(MDP_WS_FILE)) {
    try {
      const rel = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
      const base = rel.split('/').pop() || ''
      const name = base.replace(MARKDOWN_PATHNAME_EXT_RE, '')
      return name || 'document'
    } catch {
      return 'document'
    }
  }
  try {
    const pathname = new URL(fileUrl).pathname
    const base = pathname.split('/').filter(Boolean).pop() || ''
    const name = base.replace(MARKDOWN_PATHNAME_EXT_RE, '')
    return decodeURIComponent(name) || 'original file'
  } catch {
    return 'original file'
  }
}

/**
 * Convert user-entered filesystem path or file: URL to a normalized file: directory URL.
 * @param {string} input
 * @returns {string | null}
 */
export function pathInputToFileDirectoryUrl(input) {
  const trimmed = String(input || '').trim()
  if (!trimmed) return null

  if (/^file:/i.test(trimmed)) {
    try {
      return normalizeDirectoryUrl(trimmed)
    } catch {
      return null
    }
  }

  let path = trimmed.replace(/\\/g, '/').replace(/\/+$/, '')
  if (!path) return null

  // Windows: C:/Users/...
  if (/^[A-Za-z]:\//.test(path)) {
    try {
      return normalizeDirectoryUrl(`file:///${path}/`)
    } catch {
      return null
    }
  }

  // UNC: //server/share -> file://server/share/
  if (path.startsWith('//') && !path.startsWith('///')) {
    try {
      return normalizeDirectoryUrl(`file:${path}/`)
    } catch {
      return null
    }
  }

  // POSIX absolute
  if (path.startsWith('/')) {
    try {
      return normalizeDirectoryUrl(`file://${path}/`)
    } catch {
      return null
    }
  }

  return null
}
