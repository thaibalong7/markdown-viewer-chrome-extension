import { PLUGIN_IDS } from '../plugin-types.js'
import { logger } from '../../shared/logger.js'
import { attachMermaidActionsMenu } from './mermaid-actions.js'

let mermaidImportPromise = null
let mermaidInitializePromise = null
let mermaidRenderCounter = 0
let mermaidThemeKey = null

function getMermaidThemeByPreset(preset) {
  const key = String(preset || '').toLowerCase()
  if (key === 'dark') return 'dark'
  return 'default'
}

function getMermaid() {
  if (!mermaidImportPromise) {
    mermaidImportPromise = import('mermaid/dist/mermaid.esm.min.mjs').then((m) => m.default)
  }
  return mermaidImportPromise
}

function ensureMermaidInitialized(theme) {
  if (mermaidThemeKey !== theme) {
    mermaidInitializePromise = null
    mermaidThemeKey = theme
  }

  if (!mermaidInitializePromise) {
    mermaidInitializePromise = getMermaid().then((mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'strict',
        theme
      })
      return mermaid
    })
  }
  return mermaidInitializePromise
}

function isMermaidFenceClass(className) {
  return /\blanguage-mermaid\b/i.test(String(className || ''))
}

/** Human-readable text from Mermaid/render failures (safe for `textContent`). */
function formatMermaidRenderError(error) {
  if (error == null) return 'Unknown error.'
  const msg = typeof error.message === 'string' ? error.message.trim() : ''
  const str = typeof error.str === 'string' ? error.str.trim() : ''
  if (msg && str && str !== msg) return `${msg}\n\n${str}`
  if (msg) return msg
  if (str) return str
  try {
    return String(error)
  } catch {
    return 'Unknown error.'
  }
}

/** Replace node contents with parse/render error (copy-friendly) + original source. */
function setMermaidRenderError(node, code, error) {
  if (!node) return
  node.classList.add('mdp-mermaid--error')
  node.replaceChildren()

  const banner = document.createElement('div')
  banner.className = 'mdp-mermaid__error-banner'

  const title = document.createElement('div')
  title.className = 'mdp-mermaid__error-title'
  title.textContent = 'Mermaid render error'

  const message = document.createElement('pre')
  message.className = 'mdp-mermaid__error-message'
  message.setAttribute('role', 'alert')
  message.textContent = formatMermaidRenderError(error)

  banner.append(title, message)

  const sourceTitle = document.createElement('div')
  sourceTitle.className = 'mdp-mermaid__source-title'
  sourceTitle.textContent = 'Diagram source'

  const source = document.createElement('pre')
  source.className = 'mdp-mermaid__source'
  source.textContent = code

  node.append(banner, sourceTitle, source)
}

/** ```mermaid``` still as `<pre>` (incl. inside `.mdp-code-block`) → `.mdp-mermaid` text container. */
function hoistMermaidPresToDivs(articleEl) {
  for (const block of [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-code-block')]) {
    const pre = block.querySelector(':scope > pre')
    const code = pre?.querySelector(':scope > code')
    if (!code || !isMermaidFenceClass(code.className)) continue
    const div = document.createElement('div')
    div.className = 'mdp-mermaid'
    div.textContent = String(code.textContent ?? '').trimEnd()
    block.replaceWith(div)
  }

  for (const code of [...articleEl.querySelectorAll('.mdp-markdown-body pre > code')]) {
    if (!isMermaidFenceClass(code.className)) continue
    const pre = code.parentElement
    if (!(pre instanceof HTMLPreElement)) continue
    if (pre.parentElement?.classList.contains('mdp-code-block')) continue
    const div = document.createElement('div')
    div.className = 'mdp-mermaid'
    div.textContent = String(code.textContent ?? '').trimEnd()
    pre.replaceWith(div)
  }
}

export const mermaidPlugin = {
  id: PLUGIN_IDS.MERMAID,
  extendMarkdown({ markdownEngine }) {
    const md = markdownEngine.instance
    const defaultFence = md.renderer.rules.fence
    if (typeof defaultFence !== 'function') return

    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const rawInfo = token.info ? String(token.info).trim() : ''
      const lang = rawInfo.split(/\s+/)[0] || ''
      if (String(lang).toLowerCase() === 'mermaid') {
        const content = token.content.trimEnd()
        return `<div class="mdp-mermaid">${md.utils.escapeHtml(content)}</div>\n`
      }
      return defaultFence(tokens, idx, options, env, self)
    }
  },
  async afterRender({ articleEl, settings }) {
    if (!articleEl) return

    hoistMermaidPresToDivs(articleEl)

    const nodes = articleEl.querySelectorAll('.mdp-mermaid:not([data-mermaid-processed="true"])')
    if (!nodes.length) return

    let mermaidApi
    const mermaidTheme = getMermaidThemeByPreset(settings?.theme?.preset)
    try {
      mermaidApi = await ensureMermaidInitialized(mermaidTheme)
    } catch (error) {
      logger.warn('Mermaid initialization failed.', error)
      return
    }

    const allCharts = [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-mermaid')]

    for (const node of nodes) {
      const source = node.textContent || ''
      const code = String(source).trim()
      if (!code) {
        node.setAttribute('data-mermaid-processed', 'true')
        continue
      }

      try {
        mermaidRenderCounter += 1
        const id = `mdp-mermaid-${mermaidRenderCounter}`
        const out = await mermaidApi.render(id, code)
        node.innerHTML = out.svg
        const chartIndex = Math.max(1, allCharts.indexOf(node) + 1)
        attachMermaidActionsMenu(node, { chartIndex })
      } catch (error) {
        logger.warn('Mermaid block rendering failed.', error)
        setMermaidRenderError(node, code, error)
      }
      node.setAttribute('data-mermaid-processed', 'true')
    }
  }
}
