import DOMPurify from 'dompurify'

const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const purifier = createPurifier && windowRef ? createPurifier(windowRef) : null

export function sanitizeMermaidSvg(svg) {
  const rawSvg = String(svg || '')
    .replace(/@import\s+url\([^)]*\);\s*/gi, '')
    .replace(/url\(\s*['"]?(?:https?:)?\/\/[^)]*?\)/gi, '')

  if (!purifier) return ''
  return purifier.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style', 'class', 'role', 'aria-label', 'tabindex']
  })
}
