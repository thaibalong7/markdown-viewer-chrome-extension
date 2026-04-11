import { logger } from '../../shared/logger.js'
import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'
import {
  getParentDirectoryUrl,
  isMarkdownFileHref,
  normalizeDirectoryUrl,
  normalizeFileUrlForCompare
} from './url-utils.js'

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
 * Read a `file:` document (file, not directory listing) via background fetch.
 * @param {string} fileUrl
 * @returns {Promise<string>}
 */
export async function fetchFileAsText(fileUrl) {
  try {
    const response = await sendMessage({
      type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
      payload: { url: fileUrl }
    })
    if (!response?.ok) {
      logger.debug('File text fetch failed.', response?.error, fileUrl)
      return ''
    }
    return response.data?.text ?? ''
  } catch (error) {
    logger.debug('File text fetch error.', error, fileUrl)
    return ''
  }
}

/**
 * Path from `rootDirUrl` to `targetUrl` (both `file:`), posix, decoded segments, no leading slash.
 * @param {string} rootDirUrl - normalized directory URL (trailing slash ok)
 * @param {string} targetUrl - file or directory URL under root
 * @returns {string}
 */
export function posixPathRelativeToFileRoot(rootDirUrl, targetUrl) {
  try {
    const r = new URL(normalizeDirectoryUrl(rootDirUrl))
    const t = new URL(targetUrl)
    if (r.protocol !== 'file:' || t.protocol !== 'file:') return ''

    const splitDecoded = (pathname) => {
      const norm = pathname.replace(/\/+$/, '')
      return norm
        .split('/')
        .filter(Boolean)
        .map((s) => {
          try {
            return decodeURIComponent(s)
          } catch {
            return s
          }
        })
    }

    const rs = splitDecoded(r.pathname)
    const ts = splitDecoded(t.pathname)
    if (!ts.length) return ''
    if (ts.length < rs.length) return ''
    for (let i = 0; i < rs.length; i++) {
      if (ts[i] !== rs[i]) return ''
    }
    return ts.slice(rs.length).join('/')
  } catch {
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
      displayName = decodeURIComponent(base)
    } catch {
      displayName = base
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
