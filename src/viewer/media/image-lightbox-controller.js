import { getDocumentCapabilities, getFileTypeFromName } from '../../shared/file-types.js'
import { getDefaultImageResolution } from './resolution-model.js'
import { createMediaLightboxController } from './media-lightbox-controller.js'
import { readSvgSource } from './lightbox-raster.js'
import { getSvgImageDimensions } from './svg-image-dimensions.js'

let activeLightbox = null
let pendingOpen = null

function cancelPendingOpen() {
  pendingOpen?.abort()
  pendingOpen = null
}

async function prepareSvgLightbox(image, rootEl, lightbox, dimensions, resolution) {
  const controller = new AbortController()
  pendingOpen = controller
  const win = rootEl.ownerDocument.defaultView
  const onKeyDown = event => { if (event.key === 'Escape') cancelPendingOpen() }
  win.addEventListener('keydown', onKeyDown, { signal: controller.signal })
  const sourceUrl = image.currentSrc || image.src
  const sourcePromise = readSvgSource(image, controller.signal)
  try {
    const svgText = await sourcePromise
    // Fragments may select a different view; retain browser dimensions for those.
    if (!new URL(sourceUrl).hash) dimensions = getSvgImageDimensions(svgText) || dimensions
  } catch {
    // Keep browser dimensions; the raster session reports the same read failure.
  } finally {
    win.removeEventListener('keydown', onKeyDown)
  }
  if (controller.signal.aborted) return
  pendingOpen = null
  if (!image.isConnected || !rootEl.isConnected || (image.currentSrc || image.src) !== sourceUrl) return
  lightbox.open({ source: image, dimensions, resolution, readSource: () => sourcePromise })
}

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
  cancelPendingOpen()
  if (activeLightbox?.rootEl !== rootEl || !activeLightbox.isConnected) {
    destroyImageLightbox()
    activeLightbox = createMediaLightboxController({ rootEl, kind: 'image' })
  }
  const resolution = canAdjustImageResolution(image) ? getDefaultImageResolution(rootEl.ownerDocument.defaultView.devicePixelRatio) : null
  if (resolution != null) {
    activeLightbox.close()
    void prepareSvgLightbox(image, rootEl, activeLightbox, dimensions, resolution)
    return true
  }
  return activeLightbox.open({ source: image, dimensions, resolution })
}

export function closeImageLightbox() { cancelPendingOpen(); activeLightbox?.close() }
export function destroyImageLightbox() { cancelPendingOpen(); activeLightbox?.destroy(); activeLightbox = null }
