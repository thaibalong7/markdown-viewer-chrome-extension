import { logger } from '../shared/logger.js'
import { copyTextToClipboard } from '../shared/clipboard.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../shared/constants/viewer.js'
import { getToolbarHeightInScrollRoot, scrollToElementInViewer } from './scroll-utils.js'

/**
 * Hash navigation, in-article link handling, and clipboard UX for the markdown body.
 * @param {object} options
 * @param {() => ({ article?: HTMLElement | null } | null | undefined)} options.getParts
 * @param {(message: string) => void} options.showToast
 * @param {() => HTMLElement | null} options.getScrollRoot
 */
export function createArticleInteractions({ getParts, showToast, getScrollRoot } = {}) {
  /** @type {(() => void) | null} */
  let hashChangeHandler = null
  /** @type {((e: MouseEvent) => void) | null} */
  let articleClickHandler = null
  /** @type {WeakMap<HTMLButtonElement, number>} */
  const copyButtonFeedbackTimers = new WeakMap()

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
    const hash = `#${encodeURIComponent(id)}`
    const baseUrl = window.location.href.replace(/#.*$/, '')
    const url = `${baseUrl}${hash}`
    window.history.replaceState(null, '', hash)
    void copySectionLinkWithToast(url)
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
    window.history.replaceState(null, '', `#${encodeURIComponent(id)}`)
    scrollToHash({ behavior: 'smooth' })
    return true
  }

  async function copySectionLinkWithToast(url) {
    try {
      await copyTextToClipboard(url)
      showToast('Copied link')
    } catch (error) {
      logger.debug('Copy section link failed.', error)
      showToast('Could not copy link')
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
        showToast('Copied')
      }
    } catch (error) {
      logger.debug('Copy code failed.', error)
      showToast('Could not copy')
    }
  }

  function scrollToHash({ behavior = 'auto' } = {}) {
    const hash = window.location.hash || ''
    if (!hash.startsWith('#')) return
    const id = decodeURIComponent(hash.slice(1))
    if (!id) return

    const parts = getParts()
    const headingEl = parts?.article?.querySelector?.(`#${CSS.escape(id)}`)
    if (!headingEl) return

    const scrollRoot = getScrollRoot()
    if (!scrollRoot) return
    const toolbarHeight = getToolbarHeightInScrollRoot(scrollRoot)
    scrollToElementInViewer({ element: headingEl, scrollRoot, toolbarHeight, behavior })
  }

  function bind() {
    const article = getParts()?.article
    if (!article) return

    hashChangeHandler = () => {
      scrollToHash({ behavior: 'auto' })
    }
    window.addEventListener('hashchange', hashChangeHandler)

    articleClickHandler = (event) => {
      if (handleCodeCopyClick(event, article)) return
      if (handleAnchorLinkClick(event, article)) return
      handleHashLinkClick(event, article)
    }
    article.addEventListener('click', articleClickHandler)
  }

  function destroy() {
    if (hashChangeHandler) {
      window.removeEventListener('hashchange', hashChangeHandler)
    }
    hashChangeHandler = null
    const article = getParts()?.article
    if (articleClickHandler && article) {
      article.removeEventListener('click', articleClickHandler)
    }
    articleClickHandler = null
  }

  return { bind, destroy, scrollToHash, copyCodeWithToast }
}
