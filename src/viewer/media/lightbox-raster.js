import { readLocalTextResource } from '../documents/document-loader.js'
import { getRasterDimensions } from './resolution-model.js'
import { logger } from '../../shared/logger.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

function throwIfAborted(signal) {
  if (signal.aborted) throw new DOMException('Image rendering cancelled.', 'AbortError')
}

function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      image.src = ''
      reject(new DOMException('Image rendering cancelled.', 'AbortError'))
    }
    image.onload = () => { cleanup(); resolve(image) }
    image.onerror = () => { cleanup(); reject(new Error('Could not decode this image for resolution rendering.')) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else image.src = url
  })
}

export async function readSvgSource(source, signal) {
  if (source.namespaceURI === SVG_NS) {
    // This is already sanitized Mermaid output; serialize only the detached copy.
    const clone = source.cloneNode(true)
    clone.removeAttribute('tabindex')
    clone.removeAttribute('role')
    clone.removeAttribute('aria-label')
    clone.setAttribute('xmlns', SVG_NS)
    const inherited = getComputedStyle(source)
    clone.style.color = inherited.color
    clone.style.fontFamily = inherited.fontFamily
    clone.style.fontSize = inherited.fontSize
    return new XMLSerializer().serializeToString(clone)
  }
  const url = source.currentSrc || source.src
  if (new URL(url).protocol === 'file:') return readLocalTextResource(url, { signal })
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Could not read this SVG for resolution rendering.')
  return response.text()
}

function svgRasterUrl(svgText, intrinsic) {
  // SVG documents remain image resources; this detached XML is never mounted.
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS || parsed.querySelector('parsererror')) {
    throw new Error('Could not parse this SVG for resolution rendering.')
  }
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${intrinsic.width} ${intrinsic.height}`)
  root.setAttribute('width', String(intrinsic.width))
  root.setAttribute('height', String(intrinsic.height))
  root.style.width = `${intrinsic.width}px`
  root.style.height = `${intrinsic.height}px`
  root.style.maxWidth = 'none'
  root.style.maxHeight = 'none'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(root))}${intrinsic.fragment || ''}`
}

async function renderBitmap(svgText, pixels, intrinsic, signal) {
  const vector = await loadImage(svgRasterUrl(svgText, intrinsic), signal)
  throwIfAborted(signal)
  const buffer = document.createElement('canvas')
  buffer.width = pixels.width
  buffer.height = pixels.height
  try {
    const context = buffer.getContext('2d')
    if (!context) throw new Error('Could not initialize image rendering.')
    // Keep the SVG viewport fixed (including non-scaling strokes/media rules).
    // Only the offscreen pixel buffer and drawing transform change density.
    context.setTransform(pixels.width / intrinsic.width, 0, 0, pixels.height / intrinsic.height, 0, 0)
    context.drawImage(vector, 0, 0, intrinsic.width, intrinsic.height)
    const blob = await new Promise((resolve, reject) => {
      buffer.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode this resolution.')), 'image/png')
    })
    throwIfAborted(signal)
    return blob
  } finally {
    buffer.width = 0
    buffer.height = 0
    vector.src = ''
  }
}

export function createLightboxRasterSession({ host, source, width, height, baseResolution = 1, controls,
  readSource = readSvgSource, rasterize = renderBitmap, decodeImage = loadImage }) {
  const controller = new AbortController()
  let generation = 0
  let currentUrl = null
  let applied = false
  const sourceUrl = source.currentSrc || source.src
  const fragment = sourceUrl ? new URL(sourceUrl).hash : ''
  // Snapshot only this opening's source. No viewer node or file is changed.
  let sourcePromise = null
  return {
    async update(resolution) {
      if (controller.signal.aborted) return false
      const token = ++generation
      let nextUrl = null
      try {
        const pixels = getRasterDimensions({ width, height, resolution, baseResolution })
        const svgText = await (sourcePromise ||= readSource(source, controller.signal))
        throwIfAborted(controller.signal)
        if (token !== generation) return false
        const blob = await rasterize(svgText, pixels, { width: width / baseResolution, height: height / baseResolution, fragment }, controller.signal)
        if (token !== generation || controller.signal.aborted) return false
        nextUrl = URL.createObjectURL(blob)
        const bitmap = await decodeImage(nextUrl, controller.signal)
        if (token !== generation || controller.signal.aborted) return false
        bitmap.className = 'mdp-lightbox-resolution__bitmap'
        bitmap.alt = ''
        bitmap.draggable = false
        bitmap.setAttribute('aria-hidden', 'true')
        bitmap.setAttribute('data-mdp-resolution', String(resolution))
        host.replaceChildren(bitmap)
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        currentUrl = nextUrl
        nextUrl = null
        applied = true
        controls.clearError()
        return true
      } catch (error) {
        if (controller.signal.aborted || token !== generation) return false
        logger.warn('Lightbox resolution rendering failed.', { resolution, name: error?.name || 'Error' })
        controls.setError(error?.message || 'Could not render this resolution.', { disable: !applied })
        return false
      } finally {
        if (nextUrl) URL.revokeObjectURL(nextUrl)
      }
    },
    destroy() {
      generation++
      controller.abort()
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      currentUrl = null
    }
  }
}
