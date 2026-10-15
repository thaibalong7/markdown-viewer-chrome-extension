import { mountContentUi } from '../react/content/mount-content-ui.jsx'
import { MediaLightbox } from '../react/content/media/MediaLightbox.jsx'
import { createResolutionControls } from './resolution-controller.js'
import { createLightboxRasterSession } from './lightbox-raster.js'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const round = value => Math.round(value * 1000) / 1000
const ZOOM_FACTOR = 1.2

/** Shared media interaction session. Only the empty canvas is imperative DOM. */
export function createMediaLightboxController({ rootEl, kind }) {
  const doc = rootEl.ownerDocument
  const win = doc.defaultView
  const nodes = {}
  const refs = Object.fromEntries(['overlay', 'viewport', 'canvas', 'resolutionHost', 'zoomOutButton', 'zoomInButton', 'recenterButton', 'closeButton'].map(name => [name, node => { nodes[name] = node }]))
  const image = kind === 'image'
  const state = { open: false, dragging: false, rasterized: false }
  let ui
  let destroyed = false
  let rasterSession = null
  let returnFocusEl = null
  let width = 1, height = 1, viewportWidth = 1, viewportHeight = 1
  let scale = 1, maxScale = 8, x = 0, y = 0
  let pointerId = null, originX = 0, originY = 0, startX = 0, startY = 0, gestureScale = 1
  const cleanups = []

  const props = () => ({ kind, ...state, refs, onZoomOut: () => zoom(1 / ZOOM_FACTOR), onZoomIn: () => zoom(ZOOM_FACTOR), onFit: fit, onClose: close })
  const publish = () => { if (!destroyed) ui.update(props()) }
  ui = mountContentUi(rootEl, MediaLightbox, props())
  const controls = createResolutionControls({ target: nodes.resolutionHost, buttonClass: `mdp-${kind}-lightbox__button`, onChange: value => rasterSession?.update(value) ?? false })

  function metrics() {
    viewportWidth = Math.max(1, nodes.viewport.clientWidth || win.innerWidth || 1)
    viewportHeight = Math.max(1, nodes.viewport.clientHeight || win.innerHeight || 1)
  }
  function transform() {
    x = clamp(x, -(viewportWidth + width * scale) / 2, (viewportWidth + width * scale) / 2)
    y = clamp(y, -(viewportHeight + height * scale) / 2, (viewportHeight + height * scale) / 2)
    nodes.canvas.style.transform = `translate(${round(x)}px, ${round(y)}px) scale(${round(scale)})`
  }
  function fitScale() {
    return Math.max(0.1, Math.min(image ? 1 : Infinity, Math.max(1, viewportWidth - 64) / width, Math.max(1, viewportHeight - 32 - 120) / height))
  }
  function fit() { metrics(); scale = fitScale(); x = y = 0; transform() }
  function setScale(value, clientX = viewportWidth / 2, clientY = viewportHeight / 2) {
    const next = clamp(value, 0.1, maxScale)
    if (Math.abs(next - scale) < 0.0001) return
    const anchorX = clientX - viewportWidth / 2
    const anchorY = clientY - viewportHeight / 2
    x = anchorX - (anchorX - x) / scale * next
    y = anchorY - (anchorY - y) / scale * next
    scale = next
    transform()
  }
  function zoom(factor, clientX, clientY) { setScale(scale * factor, clientX, clientY) }
  function stopDragging() {
    const capturedPointer = pointerId
    pointerId = null
    if (capturedPointer != null) {
      try { nodes.viewport.releasePointerCapture?.(capturedPointer) } catch { /* Capture may already be released. */ }
    }
    pointerId = null
    state.dragging = false
    publish()
  }
  function pointerDown(event) {
    if (!state.open || event.button !== 0) return
    pointerId = event.pointerId
    originX = event.clientX; originY = event.clientY; startX = x; startY = y
    state.dragging = true
    publish()
    try { nodes.viewport.setPointerCapture?.(pointerId) } catch { /* Optional on this browser/input. */ }
    event.preventDefault()
  }
  function pointerMove(event) {
    if (pointerId == null || event.pointerId !== pointerId) return
    x = startX + event.clientX - originX; y = startY + event.clientY - originY
    transform()
  }
  function pointerEnd(event) { if (event.pointerId === pointerId) stopDragging() }
  function wheel(event) {
    if (!state.open) return
    event.preventDefault()
    if (event.ctrlKey) zoom(event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR, event.clientX, event.clientY)
    else { x -= event.deltaX; y -= event.deltaY; transform() }
  }
  function keyDown(event) {
    if (!state.open) return
    if (event.key === 'Escape') { event.preventDefault(); close() }
    else if (['+', '=', 'Add'].includes(event.key)) { event.preventDefault(); zoom(ZOOM_FACTOR) }
    else if (['-', '_', 'Subtract'].includes(event.key)) { event.preventDefault(); zoom(1 / ZOOM_FACTOR) }
    else if (['0', 'Numpad0'].includes(event.key)) { event.preventDefault(); fit() }
  }
  function resize() { if (state.open) { metrics(); transform() } }
  function listen(type, handler, options) {
    nodes.viewport.addEventListener(type, handler, options)
    cleanups.push(() => nodes.viewport.removeEventListener(type, handler, options))
  }
  listen('pointerdown', pointerDown)
  listen('pointermove', pointerMove)
  listen('pointerup', pointerEnd)
  listen('pointercancel', pointerEnd)
  listen('lostpointercapture', stopDragging)
  listen('wheel', wheel, { passive: false })
  listen('gesturestart', event => { gestureScale = scale; event.preventDefault() }, { passive: false })
  listen('gesturechange', event => {
    event.preventDefault()
    setScale(gestureScale * Number(event.scale || 1), Number(event.clientX || viewportWidth / 2), Number(event.clientY || viewportHeight / 2))
  }, { passive: false })

  function close() {
    if (!state.open || destroyed) return
    stopDragging()
    state.open = false
    state.rasterized = false
    publish()
    rasterSession?.destroy()
    rasterSession = null
    nodes.canvas.replaceChildren()
    controls.setResolution(null)
    win.removeEventListener('keydown', keyDown)
    win.removeEventListener('resize', resize)
    if (returnFocusEl?.isConnected) returnFocusEl.focus?.({ preventScroll: true })
    returnFocusEl = null
  }
  function open({ source, dimensions, baseResolution = 1, resolution = null, focusTarget = source, readSource }) {
    if (destroyed) return false
    rasterSession?.destroy()
    rasterSession = null
    stopDragging()
    width = dimensions.width; height = dimensions.height
    const clone = source.cloneNode(!image)
    for (const attr of ['tabindex', 'role', 'aria-label']) clone.removeAttribute(attr)
    clone.classList.remove('mdp-image-zoom-target', 'mdp-mermaid__zoom-target')
    clone.setAttribute('aria-hidden', 'true')
    Object.assign(clone.style, { width: '100%', height: '100%', maxWidth: 'none' })
    if (image) clone.style.objectFit = 'contain'
    else { clone.setAttribute('width', String(round(width))); clone.setAttribute('height', String(round(height))); clone.style.display = 'block' }
    nodes.canvas.style.width = `${round(width)}px`
    nodes.canvas.style.height = `${round(height)}px`
    nodes.canvas.replaceChildren(clone)
    const initial = controls.setResolution(resolution, { width, height, baseResolution })
    state.rasterized = initial != null
    if (initial != null) {
      const session = createLightboxRasterSession({ host: nodes.canvas, source, width, height, baseResolution, controls, readSource })
      rasterSession = session
      controls.setBusy(true)
      void session.update(initial).then(() => { if (!destroyed && rasterSession === session) controls.setBusy(false) })
    }
    returnFocusEl = focusTarget
    metrics()
    maxScale = image ? 8 : Math.max(8, fitScale() * 4)
    fit()
    state.open = true
    publish()
    win.addEventListener('keydown', keyDown)
    win.addEventListener('resize', resize)
    nodes.closeButton.focus({ preventScroll: true })
    return true
  }
  return {
    rootEl,
    get isConnected() { return Boolean(nodes.overlay?.isConnected) },
    open, close,
    destroy() {
      if (destroyed) return
      close()
      rasterSession?.destroy()
      controls.destroy()
      cleanups.splice(0).forEach(cleanup => cleanup())
      ui.destroy()
      destroyed = true
    }
  }
}
