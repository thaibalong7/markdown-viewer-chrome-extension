import parse from 'css-tree/parser'
import generate from 'css-tree/generator'
import walk from 'css-tree/walker'

const HTML_PROPERTIES = new Set([
  'color', 'background-color', 'font-weight', 'font-style', 'text-decoration'
])
const MATH_PROPERTIES = new Set([
  ...HTML_PROPERTIES, 'height', 'width', 'min-width', 'top', 'bottom', 'left', 'right',
  'vertical-align', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding-left', 'border-bottom-width', 'border-top-width', 'border-right-width',
  'border-color', 'position'
])
const SVG_PROPERTIES = new Set([
  ...HTML_PROPERTIES, 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'opacity', 'font-family', 'font-size',
  'font-variant', 'text-anchor', 'dominant-baseline', 'alignment-baseline',
  'text-transform', 'text-align', 'white-space', 'word-spacing', 'letter-spacing',
  'marker-start', 'marker-mid', 'marker-end', 'clip-path', 'mask', 'filter',
  'stop-color', 'stop-opacity', 'paint-order', 'display', 'visibility',
  'width', 'height', 'max-width', 'background'
])
const SVG_VARIABLES = new Set([
  '--bg', '--fg', '--line', '--accent', '--muted', '--surface', '--border',
  '--_text', '--_text-sec', '--_text-muted', '--_text-faint', '--_line', '--_arrow',
  '--_node-fill', '--_node-stroke', '--_group-fill', '--_group-hdr', '--_inner-stroke',
  '--_key-badge', '--mermaid-font-family'
])
const COLOR_FUNCTIONS = new Set([
  'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix'
])
const VALUE_NODES = new Set([
  'Value', 'Identifier', 'Hash', 'Number', 'Percentage', 'Dimension', 'String',
  'Operator', 'Function', 'Url'
])
const SELECTOR_NODES = new Set([
  'Selector', 'TypeSelector', 'IdSelector', 'ClassSelector', 'Combinator'
])
const DOCUMENT_CLASSES = new Set([
  'mdp-source-line', 'mdp-mermaid', 'mdp-alert', 'mdp-alert__title',
  'mdp-alert--note', 'mdp-alert--tip', 'mdp-alert--important', 'mdp-alert--warning', 'mdp-alert--caution'
])

export function sanitizeContentClasses(node, { diagram = false } = {}) {
  if (!node.hasAttribute('class')) return
  // Document markup must not opt into fixed/overlay styles owned by Viewer UI.
  const classes = [...node.classList].filter((name) => !name.startsWith('mdp-') || (!diagram && DOCUMENT_CLASSES.has(name)))
  if (classes.length) node.setAttribute('class', classes.join(' '))
  else node.removeAttribute('class')
}

function parseCss(source, context) {
  // Reject parser recovery, including Raw nodes, rather than re-emitting unknown syntax.
  return parse(source, {
    context, parseCustomProperty: true,
    onParseError(error) { throw error }
  })
}

function cleanDeclaration(declaration, { kind, ids } = {}) {
  if (declaration.type !== 'Declaration') return ''
  const property = declaration.property.toLowerCase()
  const allowed = kind === 'svg' ? SVG_PROPERTIES : kind === 'math' ? MATH_PROPERTIES : HTML_PROPERTIES
  if (!allowed.has(property) && !(kind === 'svg' && SVG_VARIABLES.has(property))) return ''
  let safe = true
  walk(declaration.value, (node) => {
    if (!VALUE_NODES.has(node.type)) safe = false
    if (node.type === 'Function') {
      const name = node.name.toLowerCase()
      if (!COLOR_FUNCTIONS.has(name) && !(kind === 'svg' && name === 'var')) safe = false
      if (name === 'var' && !SVG_VARIABLES.has(node.children.first?.name)) safe = false
    }
    if (node.type === 'Url') {
      const id = node.value.startsWith('#') ? ids?.get(node.value.slice(1)) : null
      if (kind !== 'svg' || !id) safe = false
      else node.value = `#${id}`
    }
    if (node.type === 'Dimension') {
      const limit = kind === 'math' ? 50 : 10000
      if (!['px', 'em', 'ex', 'pt'].includes(node.unit.toLowerCase()) || Math.abs(Number(node.value)) > limit) safe = false
    }
    if (node.type === 'Number' && Math.abs(Number(node.value)) > 10000) safe = false
    if (node.type === 'Percentage' && Math.abs(Number(node.value)) > 100) safe = false
  })
  // KaTeX uses relative positioning for a few accents, never fixed/absolute/sticky.
  if (property === 'position' && generate(declaration.value) !== 'relative') safe = false
  return safe ? `${property}:${generate(declaration.value)}` : ''
}

export function sanitizeContentStyle(style, options = {}) {
  try {
    const declarations = parseCss(String(style || ''), 'declarationList')
    return [...declarations.children].map((node) => cleanDeclaration(node, options)).filter(Boolean).join(';')
  } catch {
    // Malformed/unrecognized CSS has no visual privileges.
    return ''
  }
}

export function sanitizeSvgStylesheet(css, { scope, ids }) {
  try {
    const sheet = parseCss(css, 'stylesheet')
    const rules = []
    for (const rule of sheet.children) {
      // Drop ALL at-rules: imports (both syntaxes), fonts, keyframes, nested rules, etc.
      if (rule.type !== 'Rule' || rule.prelude?.type !== 'SelectorList') continue
      const selectors = []
      for (const selector of rule.prelude.children) {
        let safe = true
        walk(selector, (node) => {
          if (!SELECTOR_NODES.has(node.type)) safe = false
          if (node.type === 'IdSelector' && ids.has(node.name)) node.name = ids.get(node.name)
        })
        if (!safe) continue
        const value = generate(selector)
        // :is() encloses the WHOLE original selector, including sibling combinators.
        // The subject can only be the SVG root or one of its descendants.
        selectors.push(`:where([data-mdp-diagram-scope="${scope}"]):is(${value})`)
        selectors.push(`:where([data-mdp-diagram-scope="${scope}"]) :is(${value})`)
      }
      const declarations = [...rule.block.children]
        .map((node) => cleanDeclaration(node, { kind: 'svg', ids })).filter(Boolean).join(';')
      if (selectors.length && declarations) rules.push(`${selectors.join(',')}{${declarations}}`)
    }
    return rules.join('\n')
  } catch {
    return ''
  }
}

export function sanitizeSvgPresentation(node, ids) {
  for (const attribute of [...node.attributes]) {
    const name = attribute.name.toLowerCase()
    if (!SVG_PROPERTIES.has(name)) continue
    const css = sanitizeContentStyle(`${name}:${attribute.value}`, { kind: 'svg', ids })
    if (!css) node.removeAttribute(attribute.name)
    else node.setAttribute(attribute.name, css.slice(name.length + 1))
  }
}
