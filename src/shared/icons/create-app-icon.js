import { APPLICATION_ICONS } from './application-icons.js'

export const SVG_NS = 'http://www.w3.org/2000/svg'

/** Render trusted, local glyph definitions without parsing or inserting HTML. */
export function createAppIconSvg(name, { width = 18, height = 18, className } = {}) {
  const definition = Object.hasOwn(APPLICATION_ICONS, name) ? APPLICATION_ICONS[name] : APPLICATION_ICONS.info
  const icon = document.createElementNS(SVG_NS, 'svg')
  for (const [key, value] of Object.entries({
    viewBox: '0 0 24 24', width, height, fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false'
  })) icon.setAttribute(key, String(value))
  if (className) icon.setAttribute('class', className)
  for (const [tag, attributes] of definition.elements) {
    const child = document.createElementNS(SVG_NS, tag)
    for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value)
    icon.appendChild(child)
  }
  return icon
}
