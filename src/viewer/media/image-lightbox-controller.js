import { getDocumentCapabilities, getFileTypeFromName } from '../../shared/file-types.js'
import { getDefaultImageResolution } from './resolution-model.js'
import { createMediaLightboxController } from './media-lightbox-controller.js'

let activeLightbox = null

export function getRenderableImageDimensions(image) {
  const width = Number(image?.naturalWidth) || 0
  const height = Number(image?.naturalHeight) || 0
  if (image?.complete !== true || width <= 0 || height <= 0) return null
  return { width, height }
}

export function canAdjustImageResolution(image) {
  const fileTypeId = image?.getAttribute?.('data-mdp-file-type')
  if (fileTypeId) return Boolean(getDocumentCapabilities(fileTypeId)?.renderResolution)
  const source = image?.currentSrc || image?.src || ''
  if (/^data:image\/svg\+xml[;,]/i.test(source)) {
    return Boolean(getDocumentCapabilities('svg-image')?.renderResolution)
  }
  try {
    return Boolean(getFileTypeFromName(decodeURIComponent(new URL(source).pathname))?.capabilities.renderResolution)
  } catch {
    return false
  }
}

export function openImageLightbox(image) {
  const dimensions = getRenderableImageDimensions(image)
  const rootEl = image?.closest?.('.mdp-root')
  if (!dimensions || !(rootEl instanceof HTMLElement)) return false
  if (activeLightbox?.rootEl !== rootEl || !activeLightbox.isConnected) {
    destroyImageLightbox()
    activeLightbox = createMediaLightboxController({ rootEl, kind: 'image' })
  }
  return activeLightbox.open({ source: image, dimensions,
    resolution: canAdjustImageResolution(image) ? getDefaultImageResolution(rootEl.ownerDocument.defaultView.devicePixelRatio) : null })
}

export function closeImageLightbox() { activeLightbox?.close() }
export function destroyImageLightbox() { activeLightbox?.destroy(); activeLightbox = null }
