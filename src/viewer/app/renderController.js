import { mountDocumentState } from '../react/content/states/mount-document-state.js'
import { clearContentUi } from '../react/content/mount-content-ui.jsx'
import { captureReadingPosition, restoreReadingPosition } from '../navigation/reading-position.js'
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
  let readingCleanup = null
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
    return captureReadingPosition(getScrollRoot(), getArticleEl())
  }

  function restoreScrollPosition(snapshot) {
    restoreReadingPosition(snapshot, getArticleEl())
  }

  function settleReadingPosition(snapshot, article) {
    if (!snapshot) return
    restoreScrollPosition(snapshot)
    let observer = null
    const cleanup = () => {
      clearTimeout(timer)
      observer?.disconnect()
      snapshot.dispose?.()
      if (readingCleanup === cleanup) readingCleanup = null
    }
    const timer = setTimeout(cleanup, 1500)
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(() => restoreScrollPosition(snapshot))
      observer.observe(article)
    }
    readingCleanup = cleanup
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

  function scheduleInitialSkeleton(article, signal) {
    if (!article || article.childElementCount > 0 || typeof article.replaceChildren !== 'function') {
      return () => {}
    }

    let skeletonMounted = false
    let disposed = false
    let skeletonUi = null
    const timer = setTimeout(() => {
      const ownerDocument = article.ownerDocument || globalThis.document
      if (signal?.aborted || !ownerDocument?.createElement || article.childElementCount > 0) return
      article.setAttribute('aria-label', 'Loading document')
      skeletonUi = mountDocumentState(article, { skeleton: true })
      skeletonMounted = true
    }, 180)

    const dispose = () => {
      if (disposed) return
      disposed = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', dispose)
      skeletonUi?.destroy()
      if (skeletonMounted) article.removeAttribute('aria-label')
    }
    signal?.addEventListener('abort', dispose, { once: true })
    return dispose
  }

  function showRenderError(article) {
    const ownerDocument = article?.ownerDocument || globalThis.document
    if (!ownerDocument?.createElement || typeof article?.replaceChildren !== 'function') return

    mountDocumentState(article, {
      className: 'mdp-ui-state mdp-ui-state--error mdp-document-render-error', role: 'alert',
      title: 'Document could not be rendered',
      message: 'Try again. If the problem continues, refresh the file or disable optional rendering plugins.',
      onRetry: () => { void render({ preserveScroll: false, honorHash: false }) }
    })
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
    // Retain the current outline during an in-place update instead of flashing a skeleton.
    if (!preserveScroll) reactHandle?.setTocReady?.(false)
    readingCleanup?.()
    const currentRenderToken = ++renderToken
    activeRenderController?.abort()
    cleanupActiveRenderer()
    getArticleInteractions()?.closeImageLightbox?.()
    clearContentUi(getArticleEl())
    activeRenderController = new AbortController()
    const signal = activeRenderController.signal
    const scrollSnapshot = preserveScroll ? captureScrollPosition() : null
    if (scrollSnapshot) signal.addEventListener('abort', scrollSnapshot.dispose, { once: true })
    const article = getArticleEl()
    let scrollSettled = false
    const clearInitialSkeleton = scheduleInitialSkeleton(article, signal)
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
          closeImageLightbox: () => articleInteractions?.closeImageLightbox(),
          showToast: (message, options) => getReactHandle()?.showToast?.(message, options)
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
        settleReadingPosition(scrollSnapshot, article)
        scrollSettled = true
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
      if (error?.name === 'AbortError' || signal.aborted || currentRenderToken !== renderToken) return null
      logger.error('Failed to render document.', error)
      reactHandle?.setTocReady?.(true)
      showRenderError(article)
      return null
    } finally {
      if (scrollSnapshot) signal.removeEventListener('abort', scrollSnapshot.dispose)
      if (!scrollSettled) scrollSnapshot?.dispose?.()
      clearInitialSkeleton()
      if (currentRenderToken === renderToken) setArticleBusy(false)
    }
  }

  function destroy() {
    readingCleanup?.()
    ++renderToken
    activeRenderController?.abort()
    activeRenderController = null
    cleanupActiveRenderer()
    clearContentUi(getArticleEl())
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
