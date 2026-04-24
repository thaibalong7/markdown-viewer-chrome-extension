import {
  createCloseIconSvg,
  createExpandIconSvg,
  createRecenterIconSvg,
  createZoomInIconSvg,
  createZoomOutIconSvg
} from '../../viewer/icons.js'

const LIGHTBOX_CLASS = 'mdp-mermaid-lightbox'
const ZOOM_IN_FACTOR = 1.2
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR
const ZOOM_MIN = 0.1
const FIT_PADDING_X = 32
const FIT_PADDING_TOP = 32
const FIT_PADDING_BOTTOM = 120
const MAX_SCALE_MULTIPLIER = 4
const ABSOLUTE_MAX_SCALE = 8
const LIGHTBOX_RENDER_SCALE = 2

let activeLightbox = null

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

function getSvgDimensions(svgEl) {
  if (!(svgEl instanceof SVGSVGElement)) {
    return { width: 0, height: 0 }
  }

  const viewBox = svgEl.viewBox?.baseVal
  if (viewBox?.width > 0 && viewBox?.height > 0) {
    return { width: viewBox.width, height: viewBox.height }
  }

  const widthAttr = Number.parseFloat(svgEl.getAttribute('width') || '')
  const heightAttr = Number.parseFloat(svgEl.getAttribute('height') || '')
  if (widthAttr > 0 && heightAttr > 0) {
    return { width: widthAttr, height: heightAttr }
  }

  const rect = svgEl.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height }
  }

  return { width: 1, height: 1 }
}

function createControlButton({ className, label, icon }) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.setAttribute('aria-label', label)
  button.appendChild(icon)
  return button
}

function buildLightbox(rootEl) {
  const overlay = document.createElement('div')
  overlay.className = LIGHTBOX_CLASS
  overlay.hidden = true
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-hidden', 'true')

  const viewport = document.createElement('div')
  viewport.className = `${LIGHTBOX_CLASS}__viewport`

  const positioner = document.createElement('div')
  positioner.className = `${LIGHTBOX_CLASS}__positioner`

  const canvas = document.createElement('div')
  canvas.className = `${LIGHTBOX_CLASS}__canvas`

  const controls = document.createElement('div')
  controls.className = `${LIGHTBOX_CLASS}__controls`

  const zoomOutButton = createControlButton({
    className: `${LIGHTBOX_CLASS}__button`,
    label: 'Zoom out Mermaid chart',
    icon: createZoomOutIconSvg()
  })
  const zoomInButton = createControlButton({
    className: `${LIGHTBOX_CLASS}__button`,
    label: 'Zoom in Mermaid chart',
    icon: createZoomInIconSvg()
  })
  const recenterButton = createControlButton({
    className: `${LIGHTBOX_CLASS}__button`,
    label: 'Re-center Mermaid chart',
    icon: createRecenterIconSvg()
  })
  const closeButton = createControlButton({
    className: `${LIGHTBOX_CLASS}__button ${LIGHTBOX_CLASS}__button--close`,
    label: 'Close Mermaid chart',
    icon: createCloseIconSvg()
  })

  const hints = document.createElement('div')
  hints.className = `${LIGHTBOX_CLASS}__hints`
  hints.textContent =
    'Drag anywhere to pan  |  Ctrl + Scroll / pinch to zoom  |  Two-finger scroll to pan  |  +/- to zoom  |  0 to re-center  |  Esc to close'

  controls.append(zoomOutButton, zoomInButton, recenterButton, closeButton)
  positioner.appendChild(canvas)
  viewport.appendChild(positioner)
  overlay.append(viewport, controls, hints)
  rootEl.appendChild(overlay)

  return {
    rootEl,
    overlay,
    viewport,
    positioner,
    canvas,
    zoomOutButton,
    zoomInButton,
    recenterButton,
    closeButton,
    hints,
    chartEl: null,
    chartWidth: 1,
    chartHeight: 1,
    viewportWidth: 0,
    viewportHeight: 0,
    scale: 1,
    minScale: ZOOM_MIN,
    maxScale: ABSOLUTE_MAX_SCALE,
    translateX: 0,
    translateY: 0,
    pointerId: null,
    dragOriginX: 0,
    dragOriginY: 0,
    dragStartTranslateX: 0,
    dragStartTranslateY: 0,
    gestureScale: 1
  }
}

function ensureLightbox(rootEl) {
  if (!rootEl) return null

  if (activeLightbox?.rootEl === rootEl && activeLightbox.overlay.isConnected) {
    return activeLightbox
  }

  if (activeLightbox) {
    closeMermaidLightbox()
    if (activeLightbox.overlay.isConnected) {
      activeLightbox.overlay.remove()
    }
  }

  activeLightbox = buildLightbox(rootEl)
  bindPersistentListeners(activeLightbox)
  return activeLightbox
}

function updateViewportMetrics(lightbox) {
  lightbox.viewportWidth = Math.max(1, lightbox.viewport.clientWidth || window.innerWidth || 1)
  lightbox.viewportHeight = Math.max(1, lightbox.viewport.clientHeight || window.innerHeight || 1)
}

function clampPan(lightbox) {
  const chartWidth = lightbox.chartWidth * lightbox.scale
  const chartHeight = lightbox.chartHeight * lightbox.scale
  const maxPanX = lightbox.viewportWidth / 2 + chartWidth / 2
  const maxPanY = lightbox.viewportHeight / 2 + chartHeight / 2

  lightbox.translateX = clamp(lightbox.translateX, -maxPanX, maxPanX)
  lightbox.translateY = clamp(lightbox.translateY, -maxPanY, maxPanY)
}

function applyTransform(lightbox) {
  clampPan(lightbox)
  lightbox.canvas.style.transform = `translate(${round(lightbox.translateX)}px, ${round(lightbox.translateY)}px) scale(${round(lightbox.scale)})`
}

function getFitScale(lightbox) {
  const availableWidth = Math.max(1, lightbox.viewportWidth - FIT_PADDING_X * 2)
  const availableHeight = Math.max(1, lightbox.viewportHeight - FIT_PADDING_TOP - FIT_PADDING_BOTTOM)
  return Math.max(
    ZOOM_MIN,
    Math.min(availableWidth / lightbox.chartWidth, availableHeight / lightbox.chartHeight)
  )
}

function setScaleAroundPoint(lightbox, nextScale, clientX, clientY) {
  const clampedScale = clamp(nextScale, lightbox.minScale, lightbox.maxScale)
  if (Math.abs(clampedScale - lightbox.scale) < 0.0001) return

  const anchorX = clientX - lightbox.viewportWidth / 2
  const anchorY = clientY - lightbox.viewportHeight / 2

  lightbox.translateX =
    anchorX - ((anchorX - lightbox.translateX) / lightbox.scale) * clampedScale
  lightbox.translateY =
    anchorY - ((anchorY - lightbox.translateY) / lightbox.scale) * clampedScale
  lightbox.scale = clampedScale
  applyTransform(lightbox)
}

function zoomByFactor(lightbox, factor, clientX, clientY) {
  const anchorX = clientX ?? lightbox.viewportWidth / 2
  const anchorY = clientY ?? lightbox.viewportHeight / 2
  setScaleAroundPoint(lightbox, lightbox.scale * factor, anchorX, anchorY)
}

function recenterChart(lightbox) {
  updateViewportMetrics(lightbox)
  lightbox.scale = getFitScale(lightbox)
  lightbox.translateX = 0
  lightbox.translateY = 0
  applyTransform(lightbox)
}

function setChart(lightbox, sourceSvg) {
  const clone = sourceSvg.cloneNode(true)
  const { width, height } = getSvgDimensions(sourceSvg)
  const renderWidth = Math.max(1, width) * LIGHTBOX_RENDER_SCALE
  const renderHeight = Math.max(1, height) * LIGHTBOX_RENDER_SCALE

  lightbox.chartWidth = renderWidth
  lightbox.chartHeight = renderHeight
  lightbox.canvas.replaceChildren(clone)
  lightbox.chartEl = clone
  lightbox.canvas.style.width = `${round(lightbox.chartWidth)}px`
  lightbox.canvas.style.height = `${round(lightbox.chartHeight)}px`
  clone.setAttribute('width', String(round(renderWidth)))
  clone.setAttribute('height', String(round(renderHeight)))
  clone.style.width = '100%'
  clone.style.height = '100%'
  clone.style.maxWidth = 'none'
  clone.style.display = 'block'
  clone.setAttribute('aria-hidden', 'true')
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
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  if (event.button !== 0) return
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
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  if (activeLightbox.pointerId !== event.pointerId) return

  activeLightbox.translateX =
    activeLightbox.dragStartTranslateX + (event.clientX - activeLightbox.dragOriginX)
  activeLightbox.translateY =
    activeLightbox.dragStartTranslateY + (event.clientY - activeLightbox.dragOriginY)
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
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR
    zoomByFactor(activeLightbox, factor, event.clientX, event.clientY)
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
    closeMermaidLightbox()
    return
  }

  if (event.key === '+' || event.key === '=' || event.key === 'Add') {
    event.preventDefault()
    zoomByFactor(activeLightbox, ZOOM_IN_FACTOR)
    return
  }

  if (event.key === '-' || event.key === '_' || event.key === 'Subtract') {
    event.preventDefault()
    zoomByFactor(activeLightbox, ZOOM_OUT_FACTOR)
    return
  }

  if (event.key === '0' || event.key === 'Numpad0') {
    event.preventDefault()
    recenterChart(activeLightbox)
  }
}

function handleResize() {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  updateViewportMetrics(activeLightbox)
  applyTransform(activeLightbox)
}

function handleGestureStart(event) {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  activeLightbox.gestureScale = activeLightbox.scale
  event.preventDefault()
}

function handleGestureChange(event) {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  event.preventDefault()
  setScaleAroundPoint(
    activeLightbox,
    activeLightbox.gestureScale * Number(event.scale || 1),
    Number(event.clientX || activeLightbox.viewportWidth / 2),
    Number(event.clientY || activeLightbox.viewportHeight / 2)
  )
}

function bindPersistentListeners(lightbox) {
  lightbox.viewport.addEventListener('pointerdown', handlePointerDown)
  lightbox.viewport.addEventListener('pointermove', handlePointerMove)
  lightbox.viewport.addEventListener('pointerup', handlePointerEnd)
  lightbox.viewport.addEventListener('pointercancel', handlePointerEnd)
  lightbox.viewport.addEventListener('lostpointercapture', stopDragging.bind(null, lightbox))
  lightbox.viewport.addEventListener('wheel', handleWheel, { passive: false })
  lightbox.viewport.addEventListener('gesturestart', handleGestureStart, { passive: false })
  lightbox.viewport.addEventListener('gesturechange', handleGestureChange, { passive: false })

  lightbox.zoomInButton.addEventListener('click', () => zoomByFactor(lightbox, ZOOM_IN_FACTOR))
  lightbox.zoomOutButton.addEventListener('click', () => zoomByFactor(lightbox, ZOOM_OUT_FACTOR))
  lightbox.recenterButton.addEventListener('click', () => recenterChart(lightbox))
  lightbox.closeButton.addEventListener('click', () => closeMermaidLightbox())
}

export function closeMermaidLightbox() {
  if (!activeLightbox || activeLightbox.overlay.hidden) return
  stopDragging(activeLightbox)
  activeLightbox.overlay.hidden = true
  activeLightbox.overlay.classList.remove('is-open')
  activeLightbox.overlay.setAttribute('aria-hidden', 'true')
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
}

export function openMermaidLightbox(containerEl) {
  const sourceSvg = containerEl?.querySelector(':scope > svg')
  const rootEl = containerEl?.closest('.mdp-root')
  if (!(sourceSvg instanceof SVGSVGElement) || !(rootEl instanceof HTMLElement)) return

  const lightbox = ensureLightbox(rootEl)
  if (!lightbox) return

  setChart(lightbox, sourceSvg)
  updateViewportMetrics(lightbox)
  lightbox.minScale = ZOOM_MIN
  lightbox.maxScale = Math.max(ABSOLUTE_MAX_SCALE, getFitScale(lightbox) * MAX_SCALE_MULTIPLIER)
  recenterChart(lightbox)

  lightbox.overlay.hidden = false
  lightbox.overlay.classList.add('is-open')
  lightbox.overlay.setAttribute('aria-hidden', 'false')

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
}

export function attachMermaidLightbox(containerEl) {
  if (!containerEl || containerEl.dataset.mermaidLightboxAttached === 'true') return
  const svg = containerEl.querySelector(':scope > svg')
  if (!(svg instanceof SVGSVGElement)) return

  containerEl.dataset.mermaidLightboxAttached = 'true'
  svg.classList.add('mdp-mermaid__zoom-target')
  svg.setAttribute('tabindex', '0')
  svg.setAttribute('role', 'button')
  svg.setAttribute('aria-label', 'Open Mermaid chart in zoom view')

  svg.addEventListener('click', (event) => {
    event.preventDefault()
    openMermaidLightbox(containerEl)
  })

  svg.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openMermaidLightbox(containerEl)
  })
}

export function createMermaidLightboxButton() {
  return createControlButton({
    className: 'mdp-mermaid-toolbar__expand',
    label: 'Open Mermaid chart in zoom view',
    icon: createExpandIconSvg()
  })
}
