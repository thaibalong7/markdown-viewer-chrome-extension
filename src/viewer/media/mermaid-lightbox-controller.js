import { getDocumentCapabilities } from '../../shared/file-types.js'
import { createMediaLightboxController } from './media-lightbox-controller.js'

const LIGHTBOX_RENDER_SCALE = 2
let activeLightbox = null

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

export function openMermaidLightbox(containerEl) {
  const sourceSvg = containerEl?.querySelector(':scope > svg')
  const rootEl = containerEl?.closest('.mdp-root')
  if (!(sourceSvg instanceof SVGSVGElement) || !(rootEl instanceof HTMLElement)) return
  if (activeLightbox?.rootEl !== rootEl || !activeLightbox.isConnected) {
    destroyMermaidLightbox()
    activeLightbox = createMediaLightboxController({ rootEl, kind: 'mermaid' })
  }
  const intrinsic = getSvgDimensions(sourceSvg)
  activeLightbox.open({ source: sourceSvg,
    dimensions: { width: Math.max(1, intrinsic.width) * LIGHTBOX_RENDER_SCALE, height: Math.max(1, intrinsic.height) * LIGHTBOX_RENDER_SCALE },
    baseResolution: LIGHTBOX_RENDER_SCALE,
    resolution: getDocumentCapabilities('mermaid')?.renderResolution ? LIGHTBOX_RENDER_SCALE : null,
    focusTarget: containerEl.ownerDocument.activeElement === containerEl.ownerDocument.body ? sourceSvg : containerEl.ownerDocument.activeElement })
}

export function closeMermaidLightbox() { activeLightbox?.close() }

export function attachMermaidLightbox(containerEl) {
  if (!containerEl || containerEl.dataset.mermaidLightboxAttached === 'true') return () => {}
  const svg = containerEl.querySelector(':scope > svg')
  if (!(svg instanceof SVGSVGElement)) return () => {}

  containerEl.dataset.mermaidLightboxAttached = 'true'
  svg.classList.add('mdp-mermaid__zoom-target')
  svg.setAttribute('tabindex', '0')
  svg.setAttribute('role', 'button')
  svg.setAttribute('aria-label', 'Open Mermaid chart in zoom view')

  const onClick = (event) => {
    event.preventDefault()
    openMermaidLightbox(containerEl)
  }

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openMermaidLightbox(containerEl)
  }
  svg.addEventListener('click', onClick)
  svg.addEventListener('keydown', onKeyDown)
  return () => {
    svg.removeEventListener('click', onClick)
    svg.removeEventListener('keydown', onKeyDown)
    delete containerEl.dataset.mermaidLightboxAttached
  }
}

export function destroyMermaidLightbox(rootEl = null) {
  if (!activeLightbox || (rootEl && activeLightbox.rootEl !== rootEl)) return
  activeLightbox.destroy()
  activeLightbox = null
}
