/**
 * Shared Markdown URL / content heuristics (content script + explorer).
 * Keep pathname extension checks in one place to avoid drift.
 */

import { MARKDOWN_FILE_EXTENSIONS, getFileTypeFromName } from './file-types.js'

/** Compatibility export derived from the file-type registry. */
export const MARKDOWN_PATHNAME_EXT_RE = new RegExp(
  `\\.(${MARKDOWN_FILE_EXTENSIONS.join('|')})$`,
  'i'
)

/**
 * @param {string} [pathname] - `location.pathname` or similar
 * @returns {boolean}
 */
export function pathnameHasMarkdownExtension(pathname) {
  return getFileTypeFromName(pathname)?.id === 'markdown'
}

/**
 * Quick heuristic: does this text look like Markdown (headings, fences, lists, links)?
 * Used for detector scoring and bootstrap fallback.
 * @param {string} [text]
 */
export function looksLikeMarkdownText(text) {
  const value = String(text || '')
  if (value.length < 200) return false
  return (
    /^(#{1,6}\s+)/m.test(value) ||
    /^```/m.test(value) ||
    /^>\s+/m.test(value) ||
    /^(\-|\*|\+)\s+/m.test(value) ||
    /^\d+\.\s+/m.test(value) ||
    /^(\s*[-*_]{3,}\s*)$/m.test(value) ||
    /\*\*[^*]+\*\*/.test(value) ||
    /\[[^\]]+\]\([^)]+\)/.test(value)
  )
}
