import { logger } from '../shared/logger.js'
import { copyTextToClipboard } from '../shared/clipboard.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../shared/constants/viewer.js'
import {
  cancelViewerAnchorLock,
  findHeadingByHash,
  getToolbarHeightInScrollRoot,
  scrollToElementInViewerWithAnchorLock
} from './scroll-utils.js'
import {
  closeImageLightbox,
  destroyImageLightbox,
  getRenderableImageDimensions,
  openImageLightbox
} from './image-lightbox.js'

/**
 * Hash navigation, in-article link handling, and clipboard UX for the markdown body.
 * @param {object} options
 * @param {() => (HTMLElement | null | undefined)} options.getArticle
 * @param {(message: string, options?: object) => void} options.showToast
 * @param {() => HTMLElement | null} options.getScrollRoot
 * @param {(fileUrl: string, opts?: object) => Promise<void>} [options.navigateToFile]
 * @param {(headingId: string) => (string | null)} [options.updateDocumentHeading]
 * @param {(rawHref: string) => { kind: string, resolvedUrl: string | null, hash: string | null, shouldIntercept: boolean }} [options.resolveLink]
 */
export function createArticleInteractions({
  getArticle,
  showToast,
  getScrollRoot,
  navigateToFile,
  updateDocumentHeading,
  resolveLink
} = {}) {
  /** @type {(() => void) | null} */
  let hashChangeHandler = null
  /** @type {((e: MouseEvent) => void) | null} */
  let articleClickHandler = null
  /** @type {((e: KeyboardEvent) => void) | null} */
  let articleKeyDownHandler = null
  /** @type {((e: Event) => void) | null} */
  let articleImageLoadHandler = null
  /** @type {WeakMap<HTMLButtonElement, number>} */
  const copyButtonFeedbackTimers = new WeakMap()

  function markZoomableImage(image) {
    if (
      !(image instanceof HTMLImageElement) ||
      image.closest('a') ||
      !getRenderableImageDimensions(image)
    ) return
    image.classList.add('mdp-image-zoom-target')
    image.setAttribute('tabindex', '0')
    image.setAttribute('role', 'button')
    image.setAttribute(
      'aria-label',
      image.alt ? `Zoom image: ${image.alt}` : 'Open image zoom view'
    )
  }

  function prepareZoomableImages() {
    closeImageLightbox()
    const article = getArticle?.()
    if (!(article instanceof HTMLElement)) return
    for (const image of article.querySelectorAll('.mdp-markdown-body img')) {
      markZoomableImage(image)
    }
  }

  function handleImageZoom(target, article) {
    if (!(target instanceof Element)) return false
    const image = target.closest('img.mdp-image-zoom-target')
    if (!(image instanceof HTMLImageElement) || !article.contains(image)) return false
    return openImageLightbox(image)
  }

  function flashCopyButtonCopied(button) {
    const prevTimer = copyButtonFeedbackTimers.get(button)
    if (typeof prevTimer === 'number') {
      window.clearTimeout(prevTimer)
    }

    if (!button.dataset.mdpCopyOrigAria) {
      button.dataset.mdpCopyOrigAria = button.getAttribute('aria-label') || ''
    }
    button.classList.add('is-copied')
    button.setAttribute('aria-label', 'Copied')

    const timerId = window.setTimeout(() => {
      copyButtonFeedbackTimers.delete(button)
      const orig = button.dataset.mdpCopyOrigAria
      delete button.dataset.mdpCopyOrigAria
      if (!button.isConnected) return
      button.classList.remove('is-copied')
      if (orig != null) {
        if (orig === '') button.removeAttribute('aria-label')
        else button.setAttribute('aria-label', orig)
      }
    }, COPY_BUTTON_FEEDBACK_MS)

    copyButtonFeedbackTimers.set(button, timerId)
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean}
   */
  function handleCodeCopyClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const codeCopyBtn = target.closest('button.mdp-code-block__copy')
    if (!codeCopyBtn || !article.contains(codeCopyBtn)) return false
    event.preventDefault()
    const block = codeCopyBtn.closest('.mdp-code-block')
    const pre = block?.querySelector('pre')
    if (pre) {
      const text = pre.innerText ?? ''
      void copyCodeWithToast(text, codeCopyBtn)
    }
    return true
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean}
   */
  function handleAnchorLinkClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const link = target.closest('a[href^="#"]')
    if (!link || !article.contains(link)) return false
    const href = link.getAttribute('href') || ''
    const id = decodeURIComponent(href.slice(1))
    if (!id) return false
    if (!link.classList.contains('mdp-heading-anchor')) return false
    event.preventDefault()
    const url = updateDocumentHeading?.(id)
    if (url) void copySectionLinkWithToast(url)
    else showToast('Section links are unavailable for this workspace file', { variant: 'warning' })
    return true
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean}
   */
  function handleHashLinkClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const link = target.closest('a[href^="#"]')
    if (!link || !article.contains(link)) return false
    const href = link.getAttribute('href') || ''
    const id = decodeURIComponent(href.slice(1))
    if (!id) return false
    event.preventDefault()
    updateDocumentHeading?.(id)
    scrollToHash({ behavior: 'smooth', hash: id })
    return true
  }

  function updateCurrentDocumentHash(hash) {
    updateDocumentHeading?.(hash)
  }

  function scrollToTop() {
    const scrollRoot = getScrollRoot()
    cancelViewerAnchorLock(scrollRoot)
    scrollRoot?.scrollTo?.({ top: 0, behavior: 'auto' })
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean}
   */
  function handleInternalLinkClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const link = target.closest('a[href]')
    if (!(link instanceof HTMLAnchorElement) || !article.contains(link)) return false
    if (event.button !== 0) return false
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
    if (link.hasAttribute('download')) return false

    const targetAttr = (link.getAttribute('target') || '').toLowerCase()
    if (targetAttr === '_blank' || targetAttr === '_parent' || targetAttr === '_top') return false

    const href = link.getAttribute('href') || ''
    const resolved = resolveLink?.(href)
    if (!resolved?.shouldIntercept) return false
    if (resolved.kind === 'same-document-hash') return false

    event.preventDefault()

    if (resolved.kind === 'self-link') {
      if (resolved.hash) {
        updateCurrentDocumentHash(resolved.hash)
        scrollToHash({ behavior: 'smooth', hash: resolved.hash })
      } else {
        updateCurrentDocumentHash('')
        scrollToTop()
      }
      return true
    }

    if (
      (resolved.kind === 'document-file' || resolved.kind === 'workspace-virtual-file') &&
      resolved.resolvedUrl
    ) {
      void navigateToFile?.(resolved.resolvedUrl, { hash: resolved.hash || null })
      return true
    }

    return false
  }

  async function copySectionLinkWithToast(url) {
    try {
      await copyTextToClipboard(url)
      showToast('Copied link', { variant: 'success' })
    } catch (error) {
      logger.debug('Copy section link failed.', error)
      showToast('Could not copy link', { variant: 'error' })
    }
  }

  /**
   * @param {string} text
   * @param {HTMLButtonElement | null} [triggerButton]
   */
  async function copyCodeWithToast(text, triggerButton = null) {
    try {
      await copyTextToClipboard(text)
      if (triggerButton instanceof HTMLButtonElement) {
        flashCopyButtonCopied(triggerButton)
      } else {
        showToast('Copied', { variant: 'success' })
      }
    } catch (error) {
      logger.debug('Copy code failed.', error)
      showToast('Could not copy', { variant: 'error' })
    }
  }

  function scrollToHash({ behavior = 'auto', hash = window.location.hash || '' } = {}) {
    if (!hash) return

    const article = getArticle?.()
    const headingEl = findHeadingByHash(article, hash)
    if (!headingEl) return

    const scrollRoot = getScrollRoot()
    if (!scrollRoot) return
    const toolbarHeight = getToolbarHeightInScrollRoot(scrollRoot)
    scrollToElementInViewerWithAnchorLock({
      element: headingEl,
      scrollRoot,
      layoutRoot: article,
      toolbarHeight,
      behavior
    })
  }

  function bind() {
    const article = getArticle?.()
    if (!(article instanceof HTMLElement)) return

    hashChangeHandler = () => {
      scrollToHash({ behavior: 'auto' })
    }
    window.addEventListener('hashchange', hashChangeHandler)

    articleClickHandler = (event) => {
      if (handleImageZoom(event.target, article)) {
        event.preventDefault()
        return
      }
      if (handleCodeCopyClick(event, article)) return
      if (handleAnchorLinkClick(event, article)) return
      if (handleInternalLinkClick(event, article)) return
      handleHashLinkClick(event, article)
    }
    article.addEventListener('click', articleClickHandler)

    articleKeyDownHandler = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (!handleImageZoom(event.target, article)) return
      event.preventDefault()
    }
    article.addEventListener('keydown', articleKeyDownHandler)

    articleImageLoadHandler = (event) => {
      markZoomableImage(event.target)
    }
    article.addEventListener('load', articleImageLoadHandler, true)
  }

  function destroy() {
    cancelViewerAnchorLock(getScrollRoot())
    if (hashChangeHandler) {
      window.removeEventListener('hashchange', hashChangeHandler)
    }
    hashChangeHandler = null
    const article = getArticle?.()
    if (articleClickHandler && article instanceof HTMLElement) {
      article.removeEventListener('click', articleClickHandler)
    }
    articleClickHandler = null
    if (articleKeyDownHandler && article instanceof HTMLElement) {
      article.removeEventListener('keydown', articleKeyDownHandler)
    }
    articleKeyDownHandler = null
    if (articleImageLoadHandler && article instanceof HTMLElement) {
      article.removeEventListener('load', articleImageLoadHandler, true)
    }
    articleImageLoadHandler = null
    destroyImageLightbox()
  }

  return {
    bind,
    destroy,
    prepareZoomableImages,
    closeImageLightbox,
    scrollToHash,
    copyCodeWithToast
  }
}
