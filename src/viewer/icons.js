/**
 * Imperative SVG helpers for plugin-injected DOM (code blocks, Mermaid toolbar).
 * Viewer chrome icons live under `src/viewer/react/components/icons/`.
 */

/** SVG namespace URI (shared by plugins). */
export const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * @param {{ width?: number, height?: number, className?: string }} [options]
 * @returns {SVGSVGElement}
 */
function createBaseSvg({ width = 18, height = 18, className } = {}) {
  const icon = document.createElementNS(SVG_NS, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('width', String(width))
  icon.setAttribute('height', String(height))
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  if (className) icon.setAttribute('class', className)
  return icon
}

/**
 * Clipboard-style copy icon (two stacked rects), used on code blocks and Mermaid toolbar.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createCopyIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 14, height: 14, className: options.className })

  const back = document.createElementNS(SVG_NS, 'rect')
  back.setAttribute('x', '9')
  back.setAttribute('y', '9')
  back.setAttribute('width', '11')
  back.setAttribute('height', '11')
  back.setAttribute('rx', '2')
  back.setAttribute('fill', 'none')
  back.setAttribute('stroke', 'currentColor')
  back.setAttribute('stroke-width', '1.8')

  const front = document.createElementNS(SVG_NS, 'rect')
  front.setAttribute('x', '4')
  front.setAttribute('y', '4')
  front.setAttribute('width', '11')
  front.setAttribute('height', '11')
  front.setAttribute('rx', '2')
  front.setAttribute('fill', 'none')
  front.setAttribute('stroke', 'currentColor')
  front.setAttribute('stroke-width', '1.8')

  icon.append(back, front)
  return icon
}

/**
 * Maximize / expand icon for opening diagram lightboxes.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createExpandIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 14, height: 14, className: options.className })

  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute(
    'd',
    'M8 4h8v8m0-8-9 9M16 20H8v-8m0 8 9-9'
  )
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.8')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')

  icon.appendChild(path)
  return icon
}

/**
 * Zoom-in icon for the Mermaid lightbox controls.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createZoomInIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 16, height: 16, className: options.className })

  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('cx', '11')
  circle.setAttribute('cy', '11')
  circle.setAttribute('r', '6')
  circle.setAttribute('fill', 'none')
  circle.setAttribute('stroke', 'currentColor')
  circle.setAttribute('stroke-width', '1.8')

  const plusH = document.createElementNS(SVG_NS, 'path')
  plusH.setAttribute('d', 'M8.5 11h5')
  plusH.setAttribute('fill', 'none')
  plusH.setAttribute('stroke', 'currentColor')
  plusH.setAttribute('stroke-width', '1.8')
  plusH.setAttribute('stroke-linecap', 'round')

  const plusV = document.createElementNS(SVG_NS, 'path')
  plusV.setAttribute('d', 'M11 8.5v5')
  plusV.setAttribute('fill', 'none')
  plusV.setAttribute('stroke', 'currentColor')
  plusV.setAttribute('stroke-width', '1.8')
  plusV.setAttribute('stroke-linecap', 'round')

  const handle = document.createElementNS(SVG_NS, 'path')
  handle.setAttribute('d', 'M16 16l4 4')
  handle.setAttribute('fill', 'none')
  handle.setAttribute('stroke', 'currentColor')
  handle.setAttribute('stroke-width', '1.8')
  handle.setAttribute('stroke-linecap', 'round')

  icon.append(circle, plusH, plusV, handle)
  return icon
}

/**
 * Zoom-out icon for the Mermaid lightbox controls.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createZoomOutIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 16, height: 16, className: options.className })

  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('cx', '11')
  circle.setAttribute('cy', '11')
  circle.setAttribute('r', '6')
  circle.setAttribute('fill', 'none')
  circle.setAttribute('stroke', 'currentColor')
  circle.setAttribute('stroke-width', '1.8')

  const minus = document.createElementNS(SVG_NS, 'path')
  minus.setAttribute('d', 'M8.5 11h5')
  minus.setAttribute('fill', 'none')
  minus.setAttribute('stroke', 'currentColor')
  minus.setAttribute('stroke-width', '1.8')
  minus.setAttribute('stroke-linecap', 'round')

  const handle = document.createElementNS(SVG_NS, 'path')
  handle.setAttribute('d', 'M16 16l4 4')
  handle.setAttribute('fill', 'none')
  handle.setAttribute('stroke', 'currentColor')
  handle.setAttribute('stroke-width', '1.8')
  handle.setAttribute('stroke-linecap', 'round')

  icon.append(circle, minus, handle)
  return icon
}

/**
 * Re-center / reset-view icon for chart lightboxes.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createRecenterIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 16, height: 16, className: options.className })

  const outerCircle = document.createElementNS(SVG_NS, 'circle')
  outerCircle.setAttribute('cx', '12')
  outerCircle.setAttribute('cy', '12')
  outerCircle.setAttribute('r', '5.5')
  outerCircle.setAttribute('fill', 'none')
  outerCircle.setAttribute('stroke', 'currentColor')
  outerCircle.setAttribute('stroke-width', '1.8')

  const centerDot = document.createElementNS(SVG_NS, 'circle')
  centerDot.setAttribute('cx', '12')
  centerDot.setAttribute('cy', '12')
  centerDot.setAttribute('r', '1.4')
  centerDot.setAttribute('fill', 'currentColor')

  const hTop = document.createElementNS(SVG_NS, 'path')
  hTop.setAttribute('d', 'M12 3.5v2.5')
  hTop.setAttribute('fill', 'none')
  hTop.setAttribute('stroke', 'currentColor')
  hTop.setAttribute('stroke-width', '1.8')
  hTop.setAttribute('stroke-linecap', 'round')

  const hBottom = document.createElementNS(SVG_NS, 'path')
  hBottom.setAttribute('d', 'M12 18v2.5')
  hBottom.setAttribute('fill', 'none')
  hBottom.setAttribute('stroke', 'currentColor')
  hBottom.setAttribute('stroke-width', '1.8')
  hBottom.setAttribute('stroke-linecap', 'round')

  const hLeft = document.createElementNS(SVG_NS, 'path')
  hLeft.setAttribute('d', 'M3.5 12H6')
  hLeft.setAttribute('fill', 'none')
  hLeft.setAttribute('stroke', 'currentColor')
  hLeft.setAttribute('stroke-width', '1.8')
  hLeft.setAttribute('stroke-linecap', 'round')

  const hRight = document.createElementNS(SVG_NS, 'path')
  hRight.setAttribute('d', 'M18 12h2.5')
  hRight.setAttribute('fill', 'none')
  hRight.setAttribute('stroke', 'currentColor')
  hRight.setAttribute('stroke-width', '1.8')
  hRight.setAttribute('stroke-linecap', 'round')

  icon.append(outerCircle, centerDot, hTop, hBottom, hLeft, hRight)
  return icon
}

/**
 * Close icon for dismissing overlays and dialogs.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createCloseIconSvg(options = {}) {
  const icon = createBaseSvg({ width: 16, height: 16, className: options.className })

  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', 'M6 6l12 12M18 6 6 18')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.8')
  path.setAttribute('stroke-linecap', 'round')

  icon.appendChild(path)
  return icon
}
