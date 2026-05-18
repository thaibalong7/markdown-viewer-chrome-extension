import { copyTextToClipboard } from '../../shared/clipboard.js'
import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { logger } from '../../shared/logger.js'
import { buildCurrentFileLink } from './file-link-actions.js'

export function isPlainPrimaryClick(event) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
}

export function isBrowserOpenableFileHref(href) {
  return Boolean(href && !String(href).startsWith(MDP_WS_FILE))
}

export function openFileHrefInNewTab(href, openWindow = globalThis.window?.open) {
  if (!isBrowserOpenableFileHref(href)) return false
  if (typeof openWindow !== 'function') return false
  openWindow(href, '_blank', 'noopener')
  return true
}

export async function copyFileRowLink(href) {
  const link = buildCurrentFileLink(href)
  if (!link) throw new Error('No file href to copy')
  try {
    await copyTextToClipboard(link)
    return link
  } catch (error) {
    logger.debug('Copy file row link failed.', error)
    throw error
  }
}
