import { renderDocument, renderIntoElement } from './core/renderer.js'
import { buildTocItems } from './core/toc-builder.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { dismissViewerToast, showViewerToast } from './toast.js'
import { needsFullRender } from '../shared/settings-diff.js'
import { createExplorerController } from './explorer/explorer-controller.js'
import { createArticleInteractions } from './article-interactions.js'
import { mountViewerReact } from './react/mount.js'
import { getSidebarWidthPx } from './explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../shared/constants/viewer.js'

function createStyleElement(cssText) {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

function clampSidebarWidth(widthPx) {
  const width = Number(widthPx)
  if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
}

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
    this._smoothInitialHashScroll = false
    this._renderToken = 0
    this._styleElements = []
    this._reactHandle = null
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    /** @type {ReturnType<typeof createExplorerController> | null} */
    this._explorer = null
  }

  async init() {
    this._styleElements = this.styles.map(createStyleElement)
    for (const styleElement of this._styleElements) {
      this.container.appendChild(styleElement)
    }

    this._reactHandle = mountViewerReact(this.container, {
      settings: this.settings,
      markdown: this.markdown,
      currentFileUrl: '',
      tocItems: [],
      getArticleEl: () => this.parts?.article,
      getSettings: () => this.settings,
      getCurrentFileUrl: () => this._explorer?.getCurrentFileUrl?.() ?? '',
      showToast: (message) => this.showToast(message)
    })

    try {
      this.parts = await this._reactHandle.partsPromise
    } catch (error) {
      logger.error('Failed to mount viewer React shell.', error)
      this.destroy()
      return
    }

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

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this._articleInteractions.bind()
    this._explorer.init()
    this._reactHandle.updateCurrentFileUrl(this._explorer?.getCurrentFileUrl?.() ?? '')
  }

  applyReaderStyles() {
    const article = this.parts?.article
    if (!article) return

    const typo = this.settings?.typography || {}
    const layout = this.settings?.layout || {}
    const themeTarget = this.parts?.root || this.container?.host || this.container

    applyThemeSettings(themeTarget, this.settings)
    this.applySidebarWidthPreference()

    if (typo.fontFamily) article.style.fontFamily = 'var(--mdp-font-family)'
    if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
    if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
    if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'
  }

  applySidebarWidthPreference() {
    const root = this.parts?.root
    if (!root) return
    const layoutWidth = Number(this.settings?.layout?.tocWidth)
    const storedWidth = getSidebarWidthPx()
    const baseWidth = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
    const width = clampSidebarWidth(Number.isFinite(baseWidth) ? baseWidth : 280)
    root.style.setProperty('--mdp-toc-width', `${width}px`)
    this.parts?.resizeHandle?.setAttribute('aria-valuenow', String(width))
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
      this.syncTocItems()
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
      this._reactHandle?.updateCurrentFileUrl(this._explorer?.getCurrentFileUrl?.() ?? '')
    }
  }

  showToast(message) {
    showViewerToast(this.parts?.root, message)
  }

  syncTocItems() {
    const showToc = this.settings?.layout?.showToc !== false
    if (!showToc) {
      this._reactHandle?.updateTocItems([])
      return
    }

    const items = buildTocItems(this.parts?.article)
    this._reactHandle?.updateTocItems(items)
  }

  async updateSettings(nextSettings) {
    const prevSettings = this.settings
    this.settings = nextSettings
    this._reactHandle?.updateSettings(nextSettings)
    this.applyReaderStyles()
    if (!needsFullRender(prevSettings, nextSettings)) {
      this.syncTocItems()
      return null
    }
    return this.render({ preserveScroll: true, honorHash: false })
  }

  destroy() {
    dismissViewerToast(this.parts?.root)
    this._articleInteractions?.destroy()
    this._articleInteractions = null
    this._explorer?.destroy()
    this._explorer = null
    this._reactHandle?.unmount()
    this._reactHandle = null
    this._styleElements = []
    this.container.innerHTML = ''
    this.parts = null
  }
}
