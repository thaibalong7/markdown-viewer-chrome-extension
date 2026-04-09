import { createMarkdownEngine, renderMarkdown } from './markdown-engine.js'
import { createPluginManager } from '../../plugins/plugin-manager.js'
import { applyShikiToFencedCode } from './shiki-highlighter.js'
import DOMPurify from 'dompurify'

const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const purifier = createPurifier && windowRef ? createPurifier(windowRef) : null

/**
 * @param {string} html
 * @param {{ allowKatex?: boolean }} [options]
 */
export function sanitizeHtml(html, options = {}) {
  if (!purifier) return String(html || '')
  const cfg = {
    ADD_ATTR: ['style', 'tabindex']
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

export async function renderDocument(markdown, settings = {}) {
  const pluginManager = createPluginManager({ settings })
  const markdownEngine = createMarkdownEngine()

  pluginManager.extendMarkdown(markdownEngine, { settings })
  const nextMarkdown = pluginManager.preprocessMarkdown(markdown, { settings })

  const result = renderMarkdown(nextMarkdown, { markdownEngine })
  let html = result.html
  html = pluginManager.postprocessHtml(html, { settings, markdown: nextMarkdown })

  const codeOn = settings?.plugins?.codeHighlight?.enabled !== false
  if (codeOn) {
    html = await applyShikiToFencedCode(html, settings)
  }

  const mathOn = settings?.plugins?.math?.enabled === true
  const safeHtml = sanitizeHtml(html, { allowKatex: mathOn })

  return {
    html: safeHtml,
    pluginManager,
    metadata: result.metadata || {},
    warnings: []
  }
}
