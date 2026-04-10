import { createShell } from './shell/viewer-shell.js'
import { renderDocument, renderIntoElement } from './core/renderer.js'
import { rebuildToc } from './actions/rebuild-toc.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { copyTextToClipboard } from '../shared/clipboard.js'
import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from './toolbar-metrics.js'

export class MarkdownViewerApp {
  constructor({ markdown, settings, container, styles = [] }) {
    this.markdown = markdown
    this.settings = settings
    this.container = container
    this.styles = styles
    this.parts = null
    this.tocController = null
    this.shellController = null
    this.hashChangeHandler = null
    this.articleHashLinkClickHandler = null
    this._smoothInitialHashScroll = false
    this._toastTimer = null
    this._renderToken = 0
  }

  init() {
    const shell = createShell({ styles: this.styles })

    this.parts = shell.parts
    this.shellController = shell

    for (const styleElement of shell.styleElements) {
      this.container.appendChild(styleElement)
    }
    this.container.appendChild(shell.element)

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this.bindHashNavigation()
  }

  applyReaderStyles() {
    const article = this.parts?.article
    if (!article) return

    const typo = this.settings?.typography || {}
    const layout = this.settings?.layout || {}
    const sidebar = this.parts?.sidebar
    const themeTarget = this.parts?.root || this.container?.host || this.container

    applyThemeSettings(themeTarget, this.settings)

    if (typo.fontFamily) article.style.fontFamily = 'var(--mdp-font-family)'
    if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
    if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
    if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'

    if (sidebar) {
      const showToc = layout.showToc !== false
      sidebar.style.display = showToc ? '' : 'none'
      const body = sidebar.parentElement
      if (body?.classList?.contains('mdp-body')) {
        body.classList.toggle('mdp-body--no-toc', !showToc)
      }
    }
  }

  getScrollRoot() {
    return this.parts?.root || this.parts?.article?.closest?.('.mdp-root') || null
  }

  captureScrollPosition() {
    const scrollRoot = this.getScrollRoot()
    if (!scrollRoot) return null
    return { scrollRoot, top: scrollRoot.scrollTop }
  }

  restoreScrollPosition(snapshot) {
    if (!snapshot?.scrollRoot) return
    const { scrollRoot, top } = snapshot
    const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight)
    const nextTop = Math.min(Math.max(0, Number(top) || 0), maxTop)
    scrollRoot.scrollTo({ top: nextTop, behavior: 'auto' })
  }

  static _isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  static _collectChangedPaths(previous, next, basePath = '', out = new Set()) {
    if (previous === next) return out

    const prevObj = MarkdownViewerApp._isObject(previous)
    const nextObj = MarkdownViewerApp._isObject(next)

    if (!prevObj || !nextObj) {
      if (basePath) out.add(basePath)
      return out
    }

    const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
    for (const key of keys) {
      const nextPath = basePath ? `${basePath}.${key}` : key
      MarkdownViewerApp._collectChangedPaths(previous[key], next[key], nextPath, out)
    }
    return out
  }

  static _needsFullRender(previousSettings, nextSettings) {
    const changedPaths = MarkdownViewerApp._collectChangedPaths(previousSettings, nextSettings)
    if (!changedPaths.size) return false

    const styleOnlyPrefixes = ['typography.', 'layout.contentMaxWidth', 'layout.showToc', 'layout.tocWidth']

    for (const path of changedPaths) {
      const isStyleOnly = styleOnlyPrefixes.some((prefix) => path === prefix || path.startsWith(prefix))
      if (!isStyleOnly) return true
    }

    return false
  }

  async render({ preserveScroll = false, honorHash = true } = {}) {
    const renderToken = ++this._renderToken
    const scrollSnapshot = preserveScroll ? this.captureScrollPosition() : null
    let result
    try {
      result = await renderDocument(this.markdown, this.settings)
    } catch (error) {
      logger.error('Failed to render markdown document.', error)
      return null
    }
    if (renderToken !== this._renderToken) return null
    renderIntoElement(this.parts.article, result.html)
    if (renderToken !== this._renderToken) return null
    await result.pluginManager?.afterRender({
      articleEl: this.parts.article,
      settings: this.settings
    })
    if (renderToken !== this._renderToken) return null
    this.syncTocVisibility()
    if (scrollSnapshot) {
      this.restoreScrollPosition(scrollSnapshot)
    } else if (honorHash) {
      const behavior =
        this._smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
      this.scrollToHash({ behavior })
      if (this._smoothInitialHashScroll) this._smoothInitialHashScroll = false
    }
    return result
  }

  showToast(message) {
    const root = this.parts?.root
    if (!root) return

    let toast = root.querySelector('.mdp-toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.className = 'mdp-toast'
      toast.setAttribute('role', 'status')
      toast.setAttribute('aria-live', 'polite')
      root.appendChild(toast)
    }
    toast.textContent = message
    toast.classList.add('is-visible')

    if (this._toastTimer) clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible')
      this._toastTimer = null
    }, 2200)
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean} true if handled (caller should not process further)
   */
  _handleCodeCopyClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const codeCopyBtn = target.closest('button.mdp-code-block__copy')
    if (!codeCopyBtn || !article.contains(codeCopyBtn)) return false
    event.preventDefault()
    const block = codeCopyBtn.closest('.mdp-code-block')
    const pre = block?.querySelector('pre')
    if (pre) {
      const text = pre.innerText ?? ''
      void this.copyCodeWithToast(text)
    }
    return true
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean} true if handled
   */
  _handleAnchorLinkClick(event, article) {
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
    void this.copySectionLinkWithToast(url)
    return true
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} article
   * @returns {boolean} true if handled
   */
  _handleHashLinkClick(event, article) {
    const target = event.target
    if (!(target instanceof Element)) return false
    const link = target.closest('a[href^="#"]')
    if (!link || !article.contains(link)) return false
    const href = link.getAttribute('href') || ''
    const id = decodeURIComponent(href.slice(1))
    if (!id) return false
    event.preventDefault()
    window.history.replaceState(null, '', `#${encodeURIComponent(id)}`)
    this.scrollToHash({ behavior: 'smooth' })
    return true
  }

  bindHashNavigation() {
    const article = this.parts?.article
    if (!article) return

    this.hashChangeHandler = () => {
      this.scrollToHash({ behavior: 'auto' })
    }
    window.addEventListener('hashchange', this.hashChangeHandler)

    this.articleHashLinkClickHandler = (event) => {
      if (this._handleCodeCopyClick(event, article)) return
      if (this._handleAnchorLinkClick(event, article)) return
      this._handleHashLinkClick(event, article)
    }
    article.addEventListener('click', this.articleHashLinkClickHandler)
  }

  async copySectionLinkWithToast(url) {
    try {
      await copyTextToClipboard(url)
      this.showToast('Copied link')
    } catch (error) {
      logger.debug('Copy section link failed.', error)
      this.showToast('Could not copy link')
    }
  }

  async copyCodeWithToast(text) {
    try {
      await copyTextToClipboard(text)
      this.showToast('Copied')
    } catch (error) {
      logger.debug('Copy code failed.', error)
      this.showToast('Could not copy')
    }
  }

  scrollToHash({ behavior = 'auto' } = {}) {
    const hash = window.location.hash || ''
    if (!hash.startsWith('#')) return
    const id = decodeURIComponent(hash.slice(1))
    if (!id) return

    const headingEl = this.parts?.article?.querySelector?.(`#${CSS.escape(id)}`)
    if (!headingEl) return

    const scrollRoot = this.parts?.root || this.parts?.article?.closest?.('.mdp-root')
    if (!scrollRoot) return
    const toolbarEl = scrollRoot.querySelector('.mdp-toolbar')
    const toolbarHeight =
      toolbarEl?.getBoundingClientRect?.().height || MDP_TOOLBAR_HEIGHT_FALLBACK_PX

    const rootRect = scrollRoot.getBoundingClientRect()
    const headingRect = headingEl.getBoundingClientRect()
    const targetTop =
      headingRect.top - rootRect.top + scrollRoot.scrollTop - (toolbarHeight + SCROLL_PADDING_PX)
    scrollRoot.scrollTo({ top: targetTop, behavior })
  }

  syncTocVisibility() {
    const showToc = this.settings?.layout?.showToc !== false
    if (!showToc) {
      if (this.tocController) this.tocController.destroy()
      this.tocController = null
      if (this.parts?.tocContainer) this.parts.tocContainer.innerHTML = ''
      return
    }

    if (this.tocController) this.tocController.destroy()
    this.tocController = rebuildToc({
      articleEl: this.parts.article,
      tocContainerEl: this.parts.tocContainer
    })
  }

  async updateSettings(nextSettings) {
    const prevSettings = this.settings
    this.settings = nextSettings
    this.applyReaderStyles()
    if (!MarkdownViewerApp._needsFullRender(prevSettings, nextSettings)) {
      this.syncTocVisibility()
      return null
    }
    return this.render({ preserveScroll: true, honorHash: false })
  }

  destroy() {
    if (this._toastTimer) clearTimeout(this._toastTimer)
    this._toastTimer = null
    if (this.shellController?.destroy) this.shellController.destroy()
    this.shellController = null
    if (this.hashChangeHandler) {
      window.removeEventListener('hashchange', this.hashChangeHandler)
    }
    this.hashChangeHandler = null
    if (this.articleHashLinkClickHandler && this.parts?.article) {
      this.parts.article.removeEventListener('click', this.articleHashLinkClickHandler)
    }
    this.articleHashLinkClickHandler = null
    this.container.innerHTML = ''
    this.parts = null
    if (this.tocController) this.tocController.destroy()
    this.tocController = null
  }
}
