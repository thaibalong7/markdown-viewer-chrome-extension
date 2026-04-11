import { logger } from '../../shared/logger.js'
import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'

const MARKDOWN_EXT = /\.(md|markdown|mdown)$/i

/** Workspace tree entries picked via directory handle / webkitdirectory (not real file: URLs). */
export const MDP_WS_FILE = 'mdp-ws-file:'
export const MDP_WS_DIR = 'mdp-ws-dir:'

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isWorkspaceVirtualHref(href) {
  return typeof href === 'string' && (href.startsWith(MDP_WS_FILE) || href.startsWith(MDP_WS_DIR))
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
 * Resolve a raw URL from a Chrome directory listing entry to an absolute file: URL.
 * addRow() URLs can be relative ("file.md"), path-absolute ("/Users/.../file.md"),
 * or Windows-style ("/C:/Users/.../file.md").
 * @param {string} raw - raw URL from addRow() second argument
 * @param {string} dirUrl - file:///.../ with trailing slash
 * @returns {string | null}
 */
export function resolveListingHrefToFileUrl(raw, dirUrl) {
  const t = String(raw || '').trim()
  if (!t || t === '..' || t === '.') return null

  try {
    if (t.startsWith('file:')) {
      return new URL(t).href
    }

    // Path-absolute on macOS/Linux: /Users/foo/docs/bar.md
    if (t.startsWith('/') && !t.startsWith('//')) {
      return new URL(`file://${t}`).href
    }

    // Windows-style path in listing: /C:/Users/.../bar.md
    if (/^\/[A-Za-z]:\//.test(t)) {
      return new URL(`file://${t}`).href
    }

    return new URL(t, dirUrl).href
  } catch {
    return null
  }
}

/**
 * @param {string} basename
 * @returns {boolean}
 */
export function isHiddenBasename(basename) {
  return basename.startsWith('.')
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
 * Chrome's file:// directory listing builds links dynamically via JS addRow() calls
 * inside <script> tags. DOMParser won't execute these scripts, so we parse the raw
 * HTML for addRow("name","url",isDir,...) invocations.
 * @param {string} html
 * @param {string} dirUrl - file:///.../ with trailing slash
 * @returns {Array<{ name: string, href: string, isDir: boolean }>}
 */
export function collectEntriesFromChromeAddRow(html, dirUrl) {
  const pattern = /addRow\(\s*"([^"]*?)"\s*,\s*"([^"]*?)"\s*,\s*(false|true|0|1)\s*/g
  /** @type {Array<{ name: string, href: string, isDir: boolean }>} */
  const out = []
  let m
  while ((m = pattern.exec(html)) !== null) {
    const displayName = m[1]
    const rawUrl = m[2]
    const isDir = m[3] === 'true' || m[3] === '1'
    const absolute = resolveListingHrefToFileUrl(rawUrl, dirUrl)
    if (!absolute) continue

    let pathname = ''
    try {
      pathname = new URL(absolute).pathname
    } catch {
      continue
    }
    const base = pathname.split('/').filter(Boolean).pop() || ''
    if (isHiddenBasename(base)) continue

    const href = isDir ? normalizeDirectoryUrl(absolute) : absolute
    out.push({ name: displayName, href, isDir })
  }
  return out
}

/**
 * Fetch raw HTML for a file:// directory listing (Chrome addRow format).
 * @param {string} dirUrl - must be file: directory with trailing slash
 * @returns {Promise<string>}
 */
export async function fetchDirectoryListingHtml(dirUrl) {
  try {
    const response = await sendMessage({
      type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
      payload: { url: dirUrl }
    })
    if (!response?.ok) {
      logger.warn('Directory listing fetch failed.', response?.error, dirUrl)
      return ''
    }
    return response.data?.text ?? ''
  } catch (error) {
    logger.warn('Directory listing fetch error.', error)
    return ''
  }
}

/**
 * Scan the parent directory listing for sibling markdown files (same folder as current file).
 * @param {string} currentFileUrl - e.g. window.location.href
 * @returns {Promise<Array<{ displayName: string, href: string, isActive: boolean }>>}
 */
export async function scanSiblingFiles(currentFileUrl) {
  const dirUrl = getParentDirectoryUrl(currentFileUrl)
  if (!dirUrl) {
    logger.debug('Sibling scan: could not derive parent directory URL.')
    return []
  }

  const html = await fetchDirectoryListingHtml(dirUrl)
  const seen = new Set()
  /** @type {Array<{ displayName: string, href: string, isActive: boolean }>} */
  const out = []

  function pushIfMarkdown(absolute) {
    if (!isMarkdownFileHref(absolute) || seen.has(absolute)) return
    seen.add(absolute)

    let pathname = ''
    try {
      pathname = new URL(absolute).pathname
    } catch {
      return
    }
    const base = pathname.split('/').filter(Boolean).pop() || ''
    if (isHiddenBasename(base)) return

    let displayName = base
    try {
      displayName = decodeURIComponent(base.replace(MARKDOWN_EXT, ''))
    } catch {
      displayName = base.replace(MARKDOWN_EXT, '')
    }

    const normalizedCurrent = normalizeFileUrlForCompare(currentFileUrl)
    const normalizedEntry = normalizeFileUrlForCompare(absolute)
    const isActive = normalizedCurrent === normalizedEntry

    out.push({ displayName, href: absolute, isActive })
  }

  if (html) {
    const entries = collectEntriesFromChromeAddRow(html, dirUrl)
    for (const e of entries) {
      if (e.isDir) continue
      pushIfMarkdown(e.href)
    }
  }

  if (out.length === 0) {
    logger.debug(
      'Sibling scan: no .md links in directory listing (html length:',
      html.length,
      ').'
    )
  }

  out.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  )

  return out
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
