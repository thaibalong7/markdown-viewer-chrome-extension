import { logger } from '../../shared/logger.js'
import { buildTocItems } from '../core/toc-builder.js'
import { renderDocument, renderIntoElement } from '../core/renderer.js'
import { createStyleElement } from './viewerStyles.js'

/**
 * @param {object} options
 * @param {() => string} options.getMarkdown
 * @param {() => object} options.getSettings
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => object | null} options.getArticleInteractions
 * @param {() => object | null} options.getReactHandle
 * @param {() => (HTMLElement | null)} options.getScrollRoot
 * @param {HTMLElement | ShadowRoot} options.container
 */
export function createRenderController({
  getMarkdown,
  getSettings,
  getArticleEl,
  getArticleInteractions,
  getReactHandle,
  getScrollRoot,
  container
}) {
  let smoothInitialHashScroll = false
  let renderToken = 0
  let lastSuccessfulRenderMarkdown = ''
  const runtimeStyleElements = new Map()

  function injectViewerStyles(payload = {}) {
    const styleId = String(payload.id || '').trim()
    const cssText = String(payload.cssText || '')
    if (!styleId || !cssText) return
    if (runtimeStyleElements.has(styleId)) return
    const styleEl = createStyleElement(cssText)
    styleEl.setAttribute('data-mdp-runtime-style', styleId)
    container.appendChild(styleEl)
    runtimeStyleElements.set(styleId, styleEl)
  }

  function captureScrollPosition() {
    const scrollRoot = getScrollRoot()
    if (!scrollRoot) return null
    return { scrollRoot, top: scrollRoot.scrollTop }
  }

  function restoreScrollPosition(snapshot) {
    if (!snapshot?.scrollRoot) return
    const { scrollRoot, top } = snapshot
    const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight)
    const nextTop = Math.min(Math.max(0, Number(top) || 0), maxTop)
    scrollRoot.scrollTo({ top: nextTop, behavior: 'auto' })
  }

  function syncTocItems() {
    const reactHandle = getReactHandle()
    const showToc = getSettings()?.layout?.showToc !== false
    if (!showToc) {
      reactHandle?.updateChromeState?.({ tocItems: [] })
      reactHandle?.setTocReady?.(true)
      return
    }

    const items = buildTocItems(getArticleEl())
    reactHandle?.updateChromeState?.({ tocItems: items })
    reactHandle?.setTocReady?.(true)
  }

  function setArticleBusy(isBusy) {
    const article = getArticleEl()
    if (!article) return
    if (isBusy) article.setAttribute('aria-busy', 'true')
    else article.removeAttribute('aria-busy')
  }

  async function render({ preserveScroll = false, honorHash = true } = {}) {
    const reactHandle = getReactHandle()
    reactHandle?.setTocReady?.(false)
    const currentRenderToken = ++renderToken
    const scrollSnapshot = preserveScroll ? captureScrollPosition() : null
    setArticleBusy(true)
    try {
      const result = await renderDocument(getMarkdown(), getSettings(), {
        injectViewerStyles
      })

      if (currentRenderToken !== renderToken) return null
      const article = getArticleEl()
      if (!article) return null

      renderIntoElement(article, result.html)
      if (currentRenderToken !== renderToken) return null

      const articleInteractions = getArticleInteractions()
      await result.pluginManager?.afterRender({
        articleEl: article,
        settings: getSettings(),
        copyCodeWithToast: articleInteractions?.copyCodeWithToast.bind(articleInteractions)
      })
      if (currentRenderToken !== renderToken) return null

      syncTocItems()
      if (scrollSnapshot) {
        restoreScrollPosition(scrollSnapshot)
      } else if (honorHash) {
        const behavior = smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
        articleInteractions?.scrollToHash({ behavior })
        if (smoothInitialHashScroll) smoothInitialHashScroll = false
      }

      lastSuccessfulRenderMarkdown = getMarkdown()

      return result
    } catch (error) {
      logger.error('Failed to render markdown document.', error)
      reactHandle?.setTocReady?.(true)
      return null
    } finally {
      if (currentRenderToken === renderToken) setArticleBusy(false)
    }
  }

  function destroy() {
    runtimeStyleElements.clear()
  }

  return {
    render,
    syncTocItems,
    injectViewerStyles,
    captureScrollPosition,
    restoreScrollPosition,
    setSmoothInitialHashScroll: (value) => {
      smoothInitialHashScroll = Boolean(value)
    },
    getLastSuccessfulRenderMarkdown: () => lastSuccessfulRenderMarkdown,
    destroy
  }
}
