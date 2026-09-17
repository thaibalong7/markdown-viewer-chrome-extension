import { logger } from '../../shared/logger.js'
import { getFileTypeById } from '../../shared/file-types.js'
import { getDocumentRenderer } from '../documents/renderer-registry.js'
import { createStyleElement } from './viewerStyles.js'

/**
 * @param {object} options
 * @param {() => object | null} options.getLoadedDocument
 * @param {() => object} options.getSettings
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => object | null} options.getArticleInteractions
 * @param {() => object | null} options.getReactHandle
 * @param {() => (HTMLElement | null)} options.getScrollRoot
 * @param {(isBusy: boolean) => void} [options.onBusyChange]
 * @param {HTMLElement | ShadowRoot} options.container
 */
export function createRenderController({
  getLoadedDocument,
  getSettings,
  getArticleEl,
  getArticleInteractions,
  getReactHandle,
  getScrollRoot,
  onBusyChange,
  container
}) {
  let smoothInitialHashScroll = false
  let renderToken = 0
  let lastSuccessfulRenderMarkdown = ''
  let lastTocItems = []
  let activeRendererCleanup = null
  let activeRenderController = null
  const renderContextCache = new Map()
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
    const loadedDocument = getLoadedDocument()
    const capabilities = getFileTypeById(loadedDocument?.document?.fileTypeId)?.capabilities
    if (!showToc || capabilities?.outline !== true) {
      reactHandle?.updateChromeState?.({ tocItems: [] })
      reactHandle?.setTocReady?.(true)
      return
    }

    reactHandle?.updateChromeState?.({ tocItems: lastTocItems })
    reactHandle?.setTocReady?.(true)
  }

  function setArticleBusy(isBusy) {
    const article = getArticleEl()
    if (!article) return
    if (isBusy) article.setAttribute('aria-busy', 'true')
    else article.removeAttribute('aria-busy')
    onBusyChange?.(isBusy)
  }

  function scheduleInitialSkeleton(article) {
    if (!article || article.childElementCount > 0 || typeof article.replaceChildren !== 'function') {
      return () => {}
    }

    let skeletonMounted = false
    const timer = setTimeout(() => {
      const ownerDocument = article.ownerDocument || globalThis.document
      if (!ownerDocument?.createElement || article.childElementCount > 0) return
      const skeleton = ownerDocument.createElement('div')
      skeleton.className = 'mdp-skeleton mdp-document-skeleton'
      skeleton.setAttribute('aria-hidden', 'true')
      const widths = ['52%', '94%', '88%', '72%', '90%', '64%']
      for (const [index, width] of widths.entries()) {
        const line = ownerDocument.createElement('span')
        line.className = `mdp-skeleton-line${index === 0 ? ' mdp-document-skeleton__title' : ''}`
        line.style.width = width
        line.style.height = index === 0 ? '24px' : '14px'
        skeleton.appendChild(line)
      }
      article.setAttribute('aria-label', 'Loading document')
      article.replaceChildren(skeleton)
      skeletonMounted = true
    }, 180)

    return () => {
      clearTimeout(timer)
      if (skeletonMounted) article.removeAttribute('aria-label')
    }
  }

  function showRenderError(article) {
    const ownerDocument = article?.ownerDocument || globalThis.document
    if (!ownerDocument?.createElement || typeof article?.replaceChildren !== 'function') return

    const state = ownerDocument.createElement('section')
    state.className = 'mdp-ui-state mdp-ui-state--error mdp-document-render-error'
    state.setAttribute('role', 'alert')

    const title = ownerDocument.createElement('strong')
    title.className = 'mdp-ui-state__title'
    title.textContent = 'Document could not be rendered'

    const message = ownerDocument.createElement('p')
    message.className = 'mdp-ui-state__message'
    message.textContent = 'Try again. If the problem continues, refresh the file or disable optional rendering plugins.'

    const retry = ownerDocument.createElement('button')
    retry.type = 'button'
    retry.className = 'mdp-ui-button mdp-ui-state__action'
    retry.textContent = 'Try again'
    retry.addEventListener('click', () => {
      void render({ preserveScroll: false, honorHash: false })
    }, { once: true })

    state.append(title, message, retry)
    article.replaceChildren(state)
  }

  function cleanupActiveRenderer() {
    const cleanup = activeRendererCleanup
    activeRendererCleanup = null
    if (typeof cleanup !== 'function') return
    try {
      cleanup()
    } catch (error) {
      logger.debug('Could not clean up the previous document renderer.', error)
    }
  }

  async function render({ preserveScroll = false, honorHash = true } = {}) {
    const reactHandle = getReactHandle()
    reactHandle?.setTocReady?.(false)
    const currentRenderToken = ++renderToken
    activeRenderController?.abort()
    cleanupActiveRenderer()
    activeRenderController = new AbortController()
    const signal = activeRenderController.signal
    const scrollSnapshot = preserveScroll ? captureScrollPosition() : null
    const article = getArticleEl()
    const clearInitialSkeleton = scheduleInitialSkeleton(article)
    setArticleBusy(true)
    try {
      const loadedDocument = getLoadedDocument()
      const fileType = getFileTypeById(loadedDocument?.document?.fileTypeId)
      if (!loadedDocument || !fileType) throw new Error('No loadable current document is available.')
      const renderer = await getDocumentRenderer(fileType.rendererId)
      if (currentRenderToken !== renderToken || signal.aborted) return null
      if (!article) return null

      const articleInteractions = getArticleInteractions()
      const result = await renderer.render({
        loadedDocument,
        articleEl: article,
        settings: getSettings(),
        signal,
        services: {
          injectViewerStyles,
          renderContextCache,
          copyCodeWithToast: articleInteractions?.copyCodeWithToast.bind(articleInteractions),
          prepareZoomableImages: () => articleInteractions?.prepareZoomableImages(),
          closeImageLightbox: () => articleInteractions?.closeImageLightbox()
        }
      })
      if (currentRenderToken !== renderToken || signal.aborted) {
        result?.cleanup?.()
        return null
      }
      activeRendererCleanup = typeof result?.cleanup === 'function' ? result.cleanup : null
      lastTocItems = Array.isArray(result?.tocItems) ? result.tocItems : []

      syncTocItems()
      if (scrollSnapshot) {
        restoreScrollPosition(scrollSnapshot)
      } else if (honorHash) {
        const behavior = smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
        articleInteractions?.scrollToHash({ behavior })
        if (smoothInitialHashScroll) smoothInitialHashScroll = false
      }

      if (fileType.id === 'markdown') {
        lastSuccessfulRenderMarkdown = String(result?.renderedText ?? loadedDocument.text ?? '')
      }

      return result?.renderResult ?? result
    } catch (error) {
      if (error?.name === 'AbortError') return null
      logger.error('Failed to render document.', error)
      reactHandle?.setTocReady?.(true)
      showRenderError(article)
      return null
    } finally {
      clearInitialSkeleton()
      if (currentRenderToken === renderToken) setArticleBusy(false)
    }
  }

  function destroy() {
    ++renderToken
    activeRenderController?.abort()
    activeRenderController = null
    cleanupActiveRenderer()
    lastTocItems = []
    renderContextCache.clear()
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
