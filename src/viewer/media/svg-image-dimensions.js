const SVG_NS = 'http://www.w3.org/2000/svg'
const UNITS = { '': 1, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, pt: 96 / 72, pc: 16 }

function absoluteLength(value) {
  const match = String(value || '').trim().match(/^([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|in|cm|mm|q|pt|pc)?$/i)
  const length = match ? Number(match[1]) * UNITS[(match[2] || '').toLowerCase()] : 0
  return Number.isFinite(length) && length > 0 ? length : null
}

/** Read detached metadata only; SVG source must never be mounted as document DOM. */
export function getSvgImageDimensions(svgText) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS || parsed.querySelector('parsererror')) return null

  // Inline CSS overrides presentation attributes. Relative lengths are not pixels.
  const width = absoluteLength(root.style?.width || root.getAttribute('width'))
  const height = absoluteLength(root.style?.height || root.getAttribute('height'))
  if (width && height) return { width, height }

  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) return null
  const ratio = viewBox[2] / viewBox[3]
  const dimensions = width ? { width, height: width / ratio }
    : height ? { width: height * ratio, height }
      : { width: viewBox[2], height: viewBox[3] }
  return Object.values(dimensions).every(value => Number.isFinite(value) && value > 0) ? dimensions : null
}
