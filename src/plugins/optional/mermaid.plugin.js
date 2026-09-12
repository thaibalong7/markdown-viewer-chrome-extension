import { PLUGIN_IDS } from '../plugin-types.js'
import { logger } from '../../shared/logger.js'
import { closeMermaidLightbox, destroyMermaidLightbox } from './mermaid-lightbox.js'
import { renderMermaidIntoNode } from '../../viewer/mermaid/mermaid-render-service.js'

function isMermaidFenceClass(className) {
  return /\blanguage-mermaid\b/i.test(String(className || ''))
}

function hoistMermaidPresToDivs(articleEl) {
  for (const block of [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-code-block')]) {
    const pre = block.querySelector(':scope > pre')
    const code = pre?.querySelector(':scope > code')
    if (!code || !isMermaidFenceClass(code.className)) continue
    const div = articleEl.ownerDocument.createElement('div')
    div.className = 'mdp-mermaid'
    div.textContent = String(code.textContent ?? '').trimEnd()
    block.replaceWith(div)
  }

  for (const code of [...articleEl.querySelectorAll('.mdp-markdown-body pre > code')]) {
    if (!isMermaidFenceClass(code.className)) continue
    const pre = code.parentElement
    if (!pre || String(pre.tagName).toLowerCase() !== 'pre') continue
    if (pre.parentElement?.classList.contains('mdp-code-block')) continue
    const div = articleEl.ownerDocument.createElement('div')
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
  async afterRender({ articleEl, settings, copyCodeWithToast, signal }) {
    if (!articleEl) return undefined
    hoistMermaidPresToDivs(articleEl)

    const nodes = [...articleEl.querySelectorAll('.mdp-mermaid:not([data-mermaid-processed="true"])')]
    if (!nodes.length) return undefined

    const abortController = new AbortController()
    const abortFromRender = () => abortController.abort()
    if (signal?.aborted) abortFromRender()
    else signal?.addEventListener?.('abort', abortFromRender, { once: true })
    const nodeCleanups = new Set()
    const allCharts = [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-mermaid')]
    const chartIndexByNode = new Map(allCharts.map((node, index) => [node, index + 1]))

    const renderNode = async (node) => {
      try {
        const result = await renderMermaidIntoNode({
          node,
          source: node.textContent || '',
          settings,
          chartIndex: Math.max(1, chartIndexByNode.get(node) || 1),
          copyCodeWithToast,
          signal: abortController.signal
        })
        if (abortController.signal.aborted) result.cleanup?.()
        else if (typeof result.cleanup === 'function') nodeCleanups.add(result.cleanup)
      } catch (error) {
        if (error?.name !== 'AbortError') {
          logger.warn('Mermaid block rendering failed.', {
            message: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }

    let observer = null
    if (typeof IntersectionObserver !== 'function') {
      for (const node of nodes) await renderNode(node)
    } else {
      const observerRoot = articleEl.closest('.mdp-root') || null
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            observer?.unobserve(entry.target)
            void renderNode(entry.target)
          }
        },
        { root: observerRoot, rootMargin: '200px 0px', threshold: 0.01 }
      )
      for (const node of nodes) observer.observe(node)
    }

    return () => {
      abortController.abort()
      signal?.removeEventListener?.('abort', abortFromRender)
      observer?.disconnect()
      observer = null
      for (const cleanup of nodeCleanups) cleanup()
      nodeCleanups.clear()
      closeMermaidLightbox()
      destroyMermaidLightbox(articleEl.closest?.('.mdp-root'))
    }
  }
}
