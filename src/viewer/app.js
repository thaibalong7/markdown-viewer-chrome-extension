import { createShell } from './shell/viewer-shell.js'
import { renderDocument, renderIntoElement } from './core/renderer.js'
import { rebuildToc } from './actions/rebuild-toc.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { dismissViewerToast, showViewerToast } from './toast.js'
import { needsFullRender } from '../shared/settings-diff.js'
import { createExplorerController } from './explorer/explorer-controller.js'
import { createArticleInteractions } from './article-interactions.js'
import { createSidebarResize } from './sidebar-resize.js'
import { createToolbarDocumentActions } from './actions/toolbar-actions.js'

export class MarkdownViewerApp {
  /**
   * @param {object} options
   * @param {string} options.markdown
   * @param {object} options.settings
   * @param {HTMLElement | ShadowRoot} options.container
   * @param {string[]} [options.styles]
   */
  constructor({ markdown, settings, container, styles = [] } = {}) {
    this.markdown = markdown
    this.settings = settings
    this.container = container
    this.styles = styles
    this.parts = null
    this.tocController = null
    this.shellController = null
    this._smoothInitialHashScroll = false
    this._renderToken = 0
    /** @type {ReturnType<typeof createSidebarResize> | null} */
    this._sidebarResize = null
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    /** @type {ReturnType<typeof createExplorerController> | null} */
    this._explorer = null
    /** @type {ReturnType<typeof createToolbarDocumentActions> | null} */
    this._toolbarDocActions = null
  }

  init() {
    const shell = createShell({ styles: this.styles })

    this.parts = shell.parts
    this.shellController = shell

    for (const styleElement of shell.styleElements) {
      this.container.appendChild(styleElement)
    }
    this.container.appendChild(shell.element)

    this._sidebarResize = createSidebarResize({
      getParts: () => this.parts,
      getSettings: () => this.settings
    })

    this._articleInteractions = createArticleInteractions({
      getParts: () => this.parts,
      showToast: (message) => this.showToast(message),
      getScrollRoot: () => this.getScrollRoot()
    })

    this._explorer = createExplorerController({
      getParts: () => this.parts,
      getSettings: () => this.settings,
      setMarkdown: (md) => {
        this.markdown = md
      },
      setSmoothInitialHashScroll: (v) => {
        this._smoothInitialHashScroll = v
      },
      render: (opts) => this.render(opts),
      showToast: (message) => this.showToast(message),
      getScrollRoot: () => this.getScrollRoot(),
      getArticleEl: () => this.parts?.article
    })

    const toolbarActionsEl = this.parts?.toolbarActions
    if (toolbarActionsEl) {
      this._toolbarDocActions = createToolbarDocumentActions({
        mountEl: toolbarActionsEl,
        getArticleEl: () => this.parts?.article,
        getSettings: () => this.settings,
        getCurrentFileUrl: () => this._explorer?.getCurrentFileUrl?.() ?? '',
        showToast: (message) => this.showToast(message)
      })
    }

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this._articleInteractions.bind()
    this._explorer.init()
    this._sidebarResize.init()
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
      this._sidebarResize?.applySidebarWidth()
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

  async render({ preserveScroll = false, honorHash = true } = {}) {
    const renderToken = ++this._renderToken
    const scrollSnapshot = preserveScroll ? this.captureScrollPosition() : null
    let result
    try {
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
        settings: this.settings,
        copyCodeWithToast: this._articleInteractions?.copyCodeWithToast.bind(this._articleInteractions)
      })
      if (renderToken !== this._renderToken) return null
      this.syncTocVisibility()
      if (scrollSnapshot) {
        this.restoreScrollPosition(scrollSnapshot)
      } else if (honorHash) {
        const behavior =
          this._smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
        this._articleInteractions?.scrollToHash({ behavior })
        if (this._smoothInitialHashScroll) this._smoothInitialHashScroll = false
      }
      return result
    } finally {
      this._toolbarDocActions?.syncVisibility()
    }
  }

  showToast(message) {
    showViewerToast(this.parts?.root, message)
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
    if (!needsFullRender(prevSettings, nextSettings)) {
      this.syncTocVisibility()
      return null
    }
    return this.render({ preserveScroll: true, honorHash: false })
  }

  destroy() {
    dismissViewerToast(this.parts?.root)
    if (this.shellController?.destroy) this.shellController.destroy()
    this.shellController = null
    this._articleInteractions?.destroy()
    this._articleInteractions = null
    if (this.tocController) this.tocController.destroy()
    this.tocController = null
    this._sidebarResize?.destroy()
    this._sidebarResize = null
    this._toolbarDocActions?.destroy()
    this._toolbarDocActions = null
    this._explorer?.destroy()
    this._explorer = null
    this.container.innerHTML = ''
    this.parts = null
  }
}
