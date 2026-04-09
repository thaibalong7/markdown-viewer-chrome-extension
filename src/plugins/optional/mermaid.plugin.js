import { PLUGIN_IDS } from '../plugin-types.js'
import { logger } from '../../shared/logger.js'

let mermaidImportPromise = null
let mermaidInitializePromise = null
let mermaidRenderCounter = 0

function getMermaid() {
  if (!mermaidImportPromise) {
    mermaidImportPromise = import('mermaid/dist/mermaid.esm.min.mjs').then((m) => m.default)
  }
  return mermaidImportPromise
}

function ensureMermaidInitialized() {
  if (!mermaidInitializePromise) {
    mermaidInitializePromise = getMermaid().then((mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'strict'
      })
      return mermaid
    })
  }
  return mermaidInitializePromise
}

function isMermaidFenceClass(className) {
  return /\blanguage-mermaid\b/i.test(String(className || ''))
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
  async afterRender({ articleEl }) {
    if (!articleEl) return

    hoistMermaidPresToDivs(articleEl)

    const nodes = articleEl.querySelectorAll('.mdp-mermaid:not([data-mermaid-processed="true"])')
    if (!nodes.length) return

    let mermaidApi
    try {
      mermaidApi = await ensureMermaidInitialized()
    } catch (error) {
      logger.warn('Mermaid initialization failed.', error)
      return
    }

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
      } catch (error) {
        logger.warn('Mermaid block rendering failed.', error)
        node.classList.add('mdp-mermaid--error')
        node.textContent = code
      }
      node.setAttribute('data-mermaid-processed', 'true')
    }
  }
}
