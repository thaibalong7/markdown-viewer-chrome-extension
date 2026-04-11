/** SVG namespace URI (shared by viewer chrome + plugins). */
export const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Clipboard-style copy icon (two stacked rects), used on code blocks and Mermaid toolbar.
 * @param {{ className?: string }} [options]
 * @returns {SVGSVGElement}
 */
export function createCopyIconSvg(options = {}) {
  const icon = document.createElementNS(SVG_NS, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('width', '14')
  icon.setAttribute('height', '14')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  if (options.className) icon.setAttribute('class', options.className)

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
