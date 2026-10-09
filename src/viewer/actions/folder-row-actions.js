import { copyTextToClipboard } from '../../shared/clipboard.js'
import { logger } from '../../shared/logger.js'

/** Virtual folders expose their real workspace-relative identity, never a fabricated file URL. */
export function getFolderCopyPath(node, relativePath = '') {
  try {
    const url = new URL(node?.href)
    if (url.protocol === 'file:') {
      const path = `${url.host ? `//${url.host}` : ''}${url.pathname}`
      try { return decodeURIComponent(path) } catch { return path }
    }
  } catch { /* Use the indexed workspace-relative path below. */ }
  return String(relativePath || node?.name || '')
}

export async function copyFolderRowText(text) {
  if (!text) throw new Error('No folder identity to copy')
  try {
    await copyTextToClipboard(text)
  } catch (error) {
    logger.debug('Copy folder identity failed.', error)
    throw error
  }
}
