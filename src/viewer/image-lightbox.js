import {
  createCloseIconSvg,
  createRecenterIconSvg,
  createZoomInIconSvg,
  createZoomOutIconSvg
} from './icons.js'

const LIGHTBOX_CLASS = 'mdp-image-lightbox'
const ZOOM_FACTOR = 1.2
const MIN_SCALE = 0.1
const MAX_SCALE = 8
const VIEWPORT_PADDING = 32
const VIEWPORT_BOTTOM_PADDING = 120

let activeLightbox = null

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

export function getRenderableImageDimensions(image) {
  const width = Number(image?.naturalWidth) || 0
  const height = Number(image?.naturalHeight) || 0
  if (image?.complete !== true || width <= 0 || height <= 0) return null
  return { width, height }
}

function createControlButton(label, icon) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${LIGHTBOX_CLASS}__button`
  button.setAttribute('aria-label', label)
  button.appendChild(icon)
  return button
}

function buildLightbox(rootEl) {
  const overlay = document.createElement('div')
  overlay.className = LIGHTBOX_CLASS
  overlay.hidden = true
  overlay.tabIndex = -1
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Image zoom view')

  const viewport = document.createElement('div')
  viewport.className = `${LIGHTBOX_CLASS}__viewport`
  const positioner = document.createElement('div')
  positioner.className = `${LIGHTBOX_CLASS}__positioner`
  const canvas = document.createElement('div')
  canvas.className = `${LIGHTBOX_CLASS}__canvas`

  const controls = document.createElement('div')
  controls.className = `${LIGHTBOX_CLASS}__controls`
  const zoomOutButton = createControlButton('Zoom out image', createZoomOutIconSvg())
  const zoomInButton = createControlButton('Zoom in image', createZoomInIconSvg())
  const recenterButton = createControlButton('Fit image to view', createRecenterIconSvg())
  const closeButton = createControlButton('Close image zoom view', createCloseIconSvg())

  const hints = document.createElement('div')
  hints.className = `${LIGHTBOX_CLASS}__hints`
  hints.textContent =
    'Drag to pan  |  Ctrl + Scroll / pinch to zoom  |  +/- to zoom  |  0 to fit  |  Esc to close'

  controls.append(zoomOutButton, zoomInButton, recenterButton, closeButton)
  positioner.appendChild(canvas)
  viewport.appendChild(positioner)
  overlay.append(viewport, controls, hints)
  rootEl.appendChild(overlay)

  return {
    rootEl,
    overlay,
    viewport,
    canvas,
    zoomOutButton,
    zoomInButton,
    recenterButton,
    closeButton,
    width: 1,
    height: 1,
    viewportWidth: 1,
    viewportHeight: 1,
    scale: 1,
    translateX: 0,
    translateY: 0,
    pointerId: null,
    dragOriginX: 0,
    dragOriginY: 0,
    dragStartTranslateX: 0,
    dragStartTranslateY: 0,
    gestureScale: 1,
    returnFocusEl: null
  }
}

function updateViewportMetrics(lightbox) {
  lightbox.viewportWidth = Math.max(1, lightbox.viewport.clientWidth || window.innerWidth || 1)
  lightbox.viewportHeight = Math.max(1, lightbox.viewport.clientHeight || window.innerHeight || 1)
}

function applyTransform(lightbox) {
  const renderedWidth = lightbox.width * lightbox.scale
  const renderedHeight = lightbox.height * lightbox.scale
  const maxPanX = lightbox.viewportWidth / 2 + renderedWidth / 2
  const maxPanY = lightbox.viewportHeight / 2 + renderedHeight / 2
  lightbox.translateX = clamp(lightbox.translateX, -maxPanX, maxPanX)
  lightbox.translateY = clamp(lightbox.translateY, -maxPanY, maxPanY)
  lightbox.canvas.style.transform = `translate(${round(lightbox.translateX)}px, ${round(lightbox.translateY)}px) scale(${round(lightbox.scale)})`
}

function getFitScale(lightbox) {
  const availableWidth = Math.max(1, lightbox.viewportWidth - VIEWPORT_PADDING * 2)
  const availableHeight = Math.max(
    1,
    lightbox.viewportHeight - VIEWPORT_PADDING - VIEWPORT_BOTTOM_PADDING
  )
  return Math.max(
    MIN_SCALE,
    Math.min(1, availableWidth / lightbox.width, availableHeight / lightbox.height)
  )
}

function setScaleAroundPoint(lightbox, nextScale, clientX, clientY) {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  if (Math.abs(scale - lightbox.scale) < 0.0001) return
  const anchorX = clientX - lightbox.viewportWidth / 2
  const anchorY = clientY - lightbox.viewportHeight / 2
  lightbox.translateX = anchorX - ((anchorX - lightbox.translateX) / lightbox.scale) * scale
  lightbox.translateY = anchorY - ((anchorY - lightbox.translateY) / lightbox.scale) * scale
  lightbox.scale = scale
  applyTransform(lightbox)
}

function zoomBy(lightbox, factor, clientX, clientY) {
  setScaleAroundPoint(
    lightbox,
    lightbox.scale * factor,
    clientX ?? lightbox.viewportWidth / 2,
    clientY ?? lightbox.viewportHeight / 2
  )
}

function fitImage(lightbox) {
  updateViewportMetrics(lightbox)
  lightbox.scale = getFitScale(lightbox)
  lightbox.translateX = 0
  lightbox.translateY = 0
  applyTransform(lightbox)
}

function stopDragging(lightbox) {
  if (lightbox.pointerId != null && typeof lightbox.viewport.releasePointerCapture === 'function') {
    try {
      lightbox.viewport.releasePointerCapture(lightbox.pointerId)
    } catch {}
  }
  lightbox.pointerId = null
  lightbox.overlay.classList.remove('is-dragging')
}

function handlePointerDown(event) {
  if (!activeLightbox || activeLightbox.overlay.hidden || event.button !== 0) return
  activeLightbox.pointerId = event.pointerId
  activeLightbox.dragOriginX = event.clientX
  activeLightbox.dragOriginY = event.clientY
  activeLightbox.dragStartTranslateX = activeLightbox.translateX
  activeLightbox.dragStartTranslateY = activeLightbox.translateY
  activeLightbox.overlay.classList.add('is-dragging')
  if (typeof activeLightbox.viewport.setPointerCapture === 'function') {
    try {
      activeLightbox.viewport.setPointerCapture(event.pointerId)
    } catch {}
  }
  event.preventDefault()
}

function handlePointerMove(event) {
  if (!activeLightbox || activeLightbox.pointerId !== event.pointerId) return
  activeLightbox.translateX =
    activeLightbox.dragStartTranslateX + event.clientX - activeLightbox.dragOriginX
  activeLightbox.translateY =
    activeLightbox.dragStartTranslateY + event.clientY - activeLightbox.dragOriginY
  applyTransform(activeLightbox)
}

function handlePointerEnd(event) {
  if (!activeLightbox || activeLightbox.pointerId !== event.pointerId) return
  stopDragging(activeLightbox)
}

function handleWheel(event) {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  event.preventDefault()
  if (event.ctrlKey) {
    zoomBy(
      activeLightbox,
      event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR,
      event.clientX,
      event.clientY
    )
    return
  }
  activeLightbox.translateX -= event.deltaX
  activeLightbox.translateY -= event.deltaY
  applyTransform(activeLightbox)
}

function handleKeyDown(event) {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeImageLightbox()
  } else if (event.key === '+' || event.key === '=' || event.key === 'Add') {
    event.preventDefault()
    zoomBy(activeLightbox, ZOOM_FACTOR)
  } else if (event.key === '-' || event.key === '_' || event.key === 'Subtract') {
    event.preventDefault()
    zoomBy(activeLightbox, 1 / ZOOM_FACTOR)
  } else if (event.key === '0' || event.key === 'Numpad0') {
    event.preventDefault()
    fitImage(activeLightbox)
  }
}

function handleResize() {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  updateViewportMetrics(activeLightbox)
  applyTransform(activeLightbox)
}

function bindLightbox(lightbox) {
  lightbox.viewport.addEventListener('pointerdown', handlePointerDown)
  lightbox.viewport.addEventListener('pointermove', handlePointerMove)
  lightbox.viewport.addEventListener('pointerup', handlePointerEnd)
  lightbox.viewport.addEventListener('pointercancel', handlePointerEnd)
  lightbox.viewport.addEventListener('wheel', handleWheel, { passive: false })
  lightbox.viewport.addEventListener('gesturestart', (event) => {
    lightbox.gestureScale = lightbox.scale
    event.preventDefault()
  }, { passive: false })
  lightbox.viewport.addEventListener('gesturechange', (event) => {
    event.preventDefault()
    setScaleAroundPoint(
      lightbox,
      lightbox.gestureScale * Number(event.scale || 1),
      Number(event.clientX || lightbox.viewportWidth / 2),
      Number(event.clientY || lightbox.viewportHeight / 2)
    )
  }, { passive: false })
  lightbox.zoomInButton.addEventListener('click', () => zoomBy(lightbox, ZOOM_FACTOR))
  lightbox.zoomOutButton.addEventListener('click', () => zoomBy(lightbox, 1 / ZOOM_FACTOR))
  lightbox.recenterButton.addEventListener('click', () => fitImage(lightbox))
  lightbox.closeButton.addEventListener('click', closeImageLightbox)
}

function ensureLightbox(rootEl) {
  if (activeLightbox?.rootEl === rootEl && activeLightbox.overlay.isConnected) {
    return activeLightbox
  }
  destroyImageLightbox()
  activeLightbox = buildLightbox(rootEl)
  bindLightbox(activeLightbox)
  return activeLightbox
}

export function openImageLightbox(image) {
  const dimensions = getRenderableImageDimensions(image)
  const rootEl = image?.closest?.('.mdp-root')
  if (!dimensions || !(rootEl instanceof HTMLElement)) return false

  const lightbox = ensureLightbox(rootEl)
  const clone = image.cloneNode(false)
  clone.removeAttribute('tabindex')
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')
  clone.classList.remove('mdp-image-zoom-target')
  clone.setAttribute('aria-hidden', 'true')
  clone.style.width = '100%'
  clone.style.height = '100%'
  clone.style.maxWidth = 'none'
  clone.style.objectFit = 'contain'

  lightbox.width = dimensions.width
  lightbox.height = dimensions.height
  lightbox.canvas.style.width = `${dimensions.width}px`
  lightbox.canvas.style.height = `${dimensions.height}px`
  lightbox.canvas.replaceChildren(clone)
  lightbox.returnFocusEl = image
  fitImage(lightbox)
  lightbox.overlay.hidden = false
  lightbox.overlay.classList.add('is-open')
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
  lightbox.closeButton.focus()
  return true
}

export function closeImageLightbox() {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  stopDragging(activeLightbox)
  activeLightbox.overlay.hidden = true
  activeLightbox.overlay.classList.remove('is-open')
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
  activeLightbox.returnFocusEl?.focus?.()
  activeLightbox.returnFocusEl = null
}

export function destroyImageLightbox() {
  if (!activeLightbox) return
  closeImageLightbox()
  activeLightbox.overlay.remove()
  activeLightbox = null
}
