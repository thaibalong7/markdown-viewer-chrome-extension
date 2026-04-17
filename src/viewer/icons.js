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
