import { logger } from '../../shared/logger.js'
import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'

const MARKDOWN_EXT = /\.(md|markdown|mdown)$/i

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
 * @param {string} href
 * @returns {boolean}
 */
function isMarkdownFileHref(href) {
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
function resolveListingHrefToFileUrl(raw, dirUrl) {
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
 * Chrome's file:// directory listing builds links dynamically via JS addRow() calls
 * inside <script> tags. DOMParser won't execute these scripts, so we parse the raw
 * HTML for addRow("name","url",isDir,...) invocations.
 * @param {string} html
 * @param {string} dirUrl
 * @param {(absolute: string) => void} onFile
 */
function collectMarkdownFromChromeAddRow(html, dirUrl, onFile) {
  const pattern = /addRow\(\s*"([^"]*?)"\s*,\s*"([^"]*?)"\s*,\s*(false|true|0|1)\s*/g
  let m
  while ((m = pattern.exec(html)) !== null) {
    const isDir = m[3] === 'true' || m[3] === '1'
    if (isDir) continue
    const rawUrl = m[2]
    const absolute = resolveListingHrefToFileUrl(rawUrl, dirUrl)
    if (!absolute) continue
    onFile(absolute)
  }
}

/**
 * @param {string} basename
 * @returns {boolean}
 */
function isHiddenBasename(basename) {
  return basename.startsWith('.')
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

  let html = ''
  try {
    const response = await sendMessage({
      type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
      payload: { url: dirUrl }
    })
    if (!response?.ok) {
      logger.warn('Sibling scan: directory fetch failed.', response?.error, dirUrl)
      return []
    }
    html = response.data?.text ?? ''
  } catch (error) {
    logger.warn('Sibling scan: directory fetch error.', error)
    return []
  }

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
    collectMarkdownFromChromeAddRow(html, dirUrl, pushIfMarkdown)
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
function normalizeFileUrlForCompare(url) {
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
