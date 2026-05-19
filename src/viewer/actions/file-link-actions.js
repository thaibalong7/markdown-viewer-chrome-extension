import { copyTextToClipboard } from '../../shared/clipboard.js'
import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { logger } from '../../shared/logger.js'
import { normalizeFileUrlForCompare } from '../explorer/url-utils.js'

/**
 * Build the most useful copy target for the currently rendered document.
 * Prefer the browser URL when it points at the same file so heading hashes are preserved.
 *
 * @param {string} currentFileUrl
 * @param {string} [browserHref]
 * @returns {string}
 */
export function buildCurrentFileLink(
  currentFileUrl,
  browserHref = globalThis.window?.location?.href || ''
) {
  const fileUrl = String(currentFileUrl || '').trim()
  if (!fileUrl) return ''
  if (fileUrl.startsWith(MDP_WS_FILE)) return ''

  try {
    const currentBase = normalizeFileUrlForCompare(fileUrl)
    const browserBase = normalizeFileUrlForCompare(browserHref)
    if (currentBase && currentBase === browserBase) {
      return browserHref
    }
  } catch {
    /* fall back to the app's current file URL */
  }

  return fileUrl
}

export function canCopyCurrentFileLink(currentFileUrl) {
  return Boolean(buildCurrentFileLink(currentFileUrl))
}

/**
 * @param {string} currentFileUrl
 * @returns {Promise<string>} copied link
 */
export async function copyCurrentFileLink(currentFileUrl) {
  const link = buildCurrentFileLink(currentFileUrl)
  if (!link) throw new Error('No current file URL to copy')
  try {
    await copyTextToClipboard(link)
    return link
  } catch (error) {
    logger.debug('Copy current file link failed.', error)
    throw error
  }
}
