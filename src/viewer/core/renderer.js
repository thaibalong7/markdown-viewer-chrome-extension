import { renderMarkdown } from './markdown-engine.js'
import { createRenderContext } from './create-render-context.js'
import { applyShikiToFencedCode } from './shiki-highlighter.js'
import DOMPurify from 'dompurify'

const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const purifier = createPurifier && windowRef ? createPurifier(windowRef) : null

/**
 * @param {string} html
 * @param {{ allowKatex?: boolean }} [options]
 */
const ALLOWED_URI_RE =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i

export function sanitizeHtml(html, options = {}) {
  if (!purifier) return String(html || '')
  const cfg = {
    // Keep source-line markers used by editor ↔ preview scroll sync.
    ADD_ATTR: ['style', 'tabindex', 'data-line'],
    ALLOWED_URI_REGEXP: ALLOWED_URI_RE
  }
  if (options.allowKatex) {
    // Keep normal HTML tags and extend with MathML/SVG required by KaTeX output.
    cfg.USE_PROFILES = { html: true, mathMl: true, svg: true, svgFilters: true }
  }
  return purifier.sanitize(String(html || ''), cfg)
}

export function renderIntoElement(element, html) {
  if (!element) {
    throw new Error('Missing render target element.')
  }
  element.innerHTML = html || ''
}

export async function renderDocument(markdown, settings = {}, runtimeContext = {}) {
  const renderContext = await createRenderContext(settings, runtimeContext)
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
  const safeHtml = sanitizeHtml(html, { allowKatex: mathOn })

  return {
    html: safeHtml,
    pluginManager,
    metadata: {
      settingsHash: renderContext.settingsHash
    },
    warnings: []
  }
}
