import DOMPurify from 'dompurify'
import { sanitizeContentClasses, sanitizeContentStyle, sanitizeSvgPresentation, sanitizeSvgStylesheet } from '../core/content-css.js'

const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const purifier = createPurifier && windowRef ? createPurifier(windowRef) : null

export function sanitizeMermaidSvg(svg) {
  if (!purifier?.isSupported) return ''
  // DOMPurify parses into an inert fragment. No stylesheet enters the live DOM
  // until its declarations, selectors and references have been constrained.
  const fragment = purifier.sanitize(String(svg || ''), {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style', 'class', 'role', 'aria-label', 'tabindex'],
    FORBID_TAGS: ['foreignObject', 'image', 'use', 'feImage', 'animate', 'animateMotion', 'animateTransform', 'set'],
    RETURN_DOM_FRAGMENT: true
  })
  const root = fragment.firstElementChild
  if (root?.localName !== 'svg' || fragment.children.length !== 1) return ''
  const scope = `mdp-svg-${crypto.randomUUID()}`
  const ids = new Map()
  const nodes = [root, ...root.querySelectorAll('*')]
  for (const node of nodes) {
    if (node.id) {
      if (!ids.has(node.id)) ids.set(node.id, `${scope}-${ids.size}`)
      node.id = ids.get(node.id)
    }
  }
  root.setAttribute('data-mdp-diagram-scope', scope)
  for (const node of nodes) {
    sanitizeContentClasses(node, { diagram: true })
    if (node.localName === 'style') {
      node.removeAttribute('style')
      node.textContent = sanitizeSvgStylesheet(node.textContent, { scope, ids })
      if (!node.textContent) node.remove()
      continue
    }
    if (node !== root) node.removeAttribute('data-mdp-diagram-scope')
    for (const name of ['aria-labelledby', 'aria-describedby']) {
      if (!node.hasAttribute(name)) continue
      const references = node.getAttribute(name).split(/\s+/).map((id) => ids.get(id)).filter(Boolean)
      if (references.length) node.setAttribute(name, references.join(' '))
      else node.removeAttribute(name)
    }
    for (const name of ['href', 'xlink:href']) {
      if (!node.hasAttribute(name)) continue
      const href = node.getAttribute(name)
      const id = href.startsWith('#') ? ids.get(href.slice(1)) : null
      if (id) node.setAttribute(name, `#${id}`)
      else node.removeAttribute(name)
    }
    sanitizeSvgPresentation(node, ids)
    const style = sanitizeContentStyle(node.getAttribute('style'), { kind: 'svg', ids })
    if (style) node.setAttribute('style', style)
    else node.removeAttribute('style')
  }
  // The diagram cannot paint over Viewer controls even with oversized geometry.
  root.style.setProperty('overflow', 'hidden', 'important')
  root.style.setProperty('max-width', '100%')
  return root.outerHTML
}
