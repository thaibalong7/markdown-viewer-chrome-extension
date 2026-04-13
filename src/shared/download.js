import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { logger } from './logger.js'

/**
 * Safe basename for `chrome.downloads` / anchor download (no path segments).
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeDownloadFilename(filename) {
  return String(filename || 'download')
    .replace(/[/<>:"\\|?*\u0000-\u001f]+/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^[/\\]+/, '')
    .replace(/^\.+$/, 'download')
    .trim()
    .slice(0, 200) || 'download'
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to encode file for download.'))
    }
    reader.onerror = () => reject(reader.error || new Error('FileReader failed.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Best parent for a temporary download link: must not sit under `<body>` when the
 * markdown viewer sets `document.body.inert` — in that case programmatic `.click()`
 * on anchors in the body subtree often does not start a download (Chrome).
 */
function resolveDownloadMountParent() {
  return document.documentElement || document.body
}

/** `filename` must already be sanitized by `triggerDownload()`. */
function triggerDownloadViaAnchor({ blob, filename }) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  const mountTarget = resolveDownloadMountParent()
  mountTarget.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Programmatic file download. On extension pages / `file:` hosts, uses
 * `chrome.downloads` via the service worker (blob → data URL → message).
 * Else falls back to a temporary `<a download>`.
 *
 * @param {{ blob: Blob, filename: string }} options
 * @returns {Promise<void>}
 */
export async function triggerDownload({ blob, filename }) {
  const safeName = sanitizeDownloadFilename(filename)

  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    try {
      const dataUrl = await blobToDataUrl(blob)
      const response = await sendMessage({
        type: MESSAGE_TYPES.DOWNLOAD_DATA_URL,
        payload: { dataUrl, filename: safeName }
      })
      if (!response?.ok) {
        throw new Error(response?.error || 'Download failed.')
      }
      return
    } catch (err) {
      logger.debug('chrome.downloads unavailable, falling back to anchor download.', err)
    }
  }

  triggerDownloadViaAnchor({ blob, filename: safeName })
}
