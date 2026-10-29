import { clearContentUi } from '../react/content/mount-content-ui.jsx'
import { renderMarkdown } from './markdown-engine.js'
import { createRenderContext } from './create-render-context.js'
import { applyShikiToFencedCode } from './shiki-highlighter.js'
import DOMPurify from 'dompurify'
import { sanitizeContentClasses, sanitizeContentStyle, sanitizeSvgPresentation } from './content-css.js'

const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const purifier = createPurifier && windowRef ? createPurifier(windowRef) : null

function isExternalWebsiteHref(href) {
  const value = String(href || '').trimStart()
  return /^https?:\/\//i.test(value) || /^\/\//.test(value)
}

export function hardenExternalWebsiteLink(node) {
  if (
    String(node?.nodeName).toLowerCase() !== 'a' ||
    !isExternalWebsiteHref(node.getAttribute('href'))
  ) return false

  node.setAttribute('target', '_blank')
  const relValues = new Set((node.getAttribute('rel') || '').split(/\s+/).filter(Boolean))
  relValues.add('noopener')
  relValues.add('noreferrer')
  node.setAttribute('rel', [...relValues].join(' '))
  return true
}

if (purifier?.isSupported) {
  purifier.addHook('afterSanitizeAttributes', (node) => {
    hardenExternalWebsiteLink(node)
  })
}

/**
 * @param {string} html
 * @param {{ allowKatex?: boolean, mathStyleToken?: string }} [options]
 */
const ALLOWED_URI_RE =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i

export function sanitizeHtml(html, options = {}) {
  if (!purifier?.isSupported) return ''
  const cfg = {
    // Keep source-line markers used by editor ↔ preview scroll sync.
    ADD_ATTR: ['style', 'tabindex', 'data-line'],
    ALLOWED_URI_REGEXP: ALLOWED_URI_RE,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'link', 'meta', 'base', 'foreignObject', 'image', 'use', 'feImage'],
    FORBID_ATTR: ['srcset']
  }
  if (options.allowKatex) {
    // Keep normal HTML tags and extend with MathML/SVG required by KaTeX output.
    cfg.USE_PROFILES = { html: true, mathMl: true, svg: true }
  }
  const cleanStyles = (node) => {
    if (!node.getAttribute) return
    sanitizeContentClasses(node)
    const trustedMath = options.mathStyleToken &&
      node.getAttribute('data-mdp-math-style') === options.mathStyleToken
    if (node.hasAttribute('style')) {
      const style = sanitizeContentStyle(node.getAttribute('style'), { kind: trustedMath ? 'math' : 'html' })
      if (style) node.setAttribute('style', style)
      else node.removeAttribute('style')
    }
    node.removeAttribute('data-mdp-math-style')
    for (const name of ['src', 'href', 'xlink:href']) {
      const value = node.getAttribute(name) || ''
      if (/^\s*data:/i.test(value) && !(node.localName === 'img' && name === 'src' &&
        /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z\d+/=\s]+$/i.test(value))) {
        node.removeAttribute(name)
      }
    }
    if (node.namespaceURI === 'http://www.w3.org/2000/svg') sanitizeSvgPresentation(node)
  }
  purifier.addHook('afterSanitizeAttributes', cleanStyles)
  try {
    return purifier.sanitize(String(html || ''), cfg)
  } finally {
    purifier.removeHook('afterSanitizeAttributes')
  }
}

export function renderIntoElement(element, html) {
  if (!element) {
    throw new Error('Missing render target element.')
  }
  clearContentUi(element)
  element.innerHTML = html || ''
}

export async function renderDocument(markdown, settings = {}, runtimeContext = {}) {
  const warnings = []
  const reportPluginWarning = (warning) => {
    warnings.push(warning)
    runtimeContext?.onPluginWarning?.(warning)
  }
  const renderContext = await createRenderContext(settings, {
    ...runtimeContext,
    onPluginWarning: reportPluginWarning
  })
  const { pluginManager, markdownEngine } = renderContext
  const nextMarkdown = pluginManager.preprocessMarkdown(markdown, renderContext.runtimeContext)

  const result = renderMarkdown(nextMarkdown, { markdownEngine })
  let html = result.html
  html = pluginManager.postprocessHtml(html, {
    ...renderContext.runtimeContext,
    markdown: nextMarkdown
  })

  const codeOn = settings?.plugins?.codeHighlight?.enabled !== false
  if (codeOn) {
    html = await applyShikiToFencedCode(html, settings)
  }

  const mathOn = settings?.plugins?.math?.enabled === true
  const safeHtml = sanitizeHtml(html, { allowKatex: mathOn, mathStyleToken: markdownEngine.mathStyleToken })

  return {
    html: safeHtml,
    pluginManager,
    metadata: {
      settingsHash: renderContext.settingsHash
    },
    warnings
  }
}
