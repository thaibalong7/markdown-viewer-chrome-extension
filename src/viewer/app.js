import { renderDocument, renderIntoElement } from './core/renderer.js'
import { buildTocItems } from './core/toc-builder.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { needsFullRender } from '../shared/settings-diff.js'
import { createArticleInteractions } from './article-interactions.js'
import { mountViewerReact } from './react/mount.js'
import { getSidebarWidthPx } from './explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../shared/constants/viewer.js'

function clampSidebarWidth(widthPx) {
  const width = Number(widthPx)
  if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
}

function createStyleElement(cssText) {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
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
    /** @type {HTMLElement | null} */
    this._rootEl = null
    /** @type {HTMLElement | null} */
    this._articleEl = null
    this._smoothInitialHashScroll = false
    this._renderToken = 0
    this._styleElements = []
    this._runtimeStyleElements = new Map()
    this._reactHandle = null
    this._currentFileUrl = window.location.href
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    this._destroyed = false
  }

  async init() {
    this._styleElements = this.styles.map(createStyleElement)
    for (const styleElement of this._styleElements) {
      this.container.appendChild(styleElement)
    }

    this._reactHandle = mountViewerReact(this.container, {
      settings: this.settings,
      tocItems: [],
      explorerBridge: {
        getSettings: () => this.settings,
        setMarkdown: (md) => {
          this.markdown = md
        },
        setSmoothInitialHashScroll: (value) => {
          this._smoothInitialHashScroll = Boolean(value)
        },
        render: (opts) => this.render(opts),
        showToast: (message) => this.showToast(message),
        getScrollRoot: () => this.getScrollRoot(),
        getArticleEl: () => this._articleEl,
        updateCurrentFileUrl: (nextUrl) => {
          this._currentFileUrl = typeof nextUrl === 'string' ? nextUrl : ''
          this._reactHandle?.bumpChrome()
        }
      },
      getArticleEl: () => this._articleEl,
      getSettings: () => this.settings,
      getCurrentFileUrl: () => this._currentFileUrl
    })

    try {
      const shell = await this._reactHandle.partsPromise
      this._rootEl = shell?.root ?? null
      this._articleEl = shell?.article ?? null
    } catch (error) {
      logger.error('Failed to mount viewer React shell.', error)
      this.destroy()
      return
    }

    this._articleInteractions = createArticleInteractions({
      getArticle: () => this._articleEl,
      showToast: (message) => this.showToast(message),
      getScrollRoot: () => this.getScrollRoot()
    })

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this._articleInteractions.bind()
  }

  applyReaderStyles() {
    const article = this._articleEl
    if (!article) return

    const typo = this.settings?.typography || {}
    const layout = this.settings?.layout || {}
    const themeTarget = this._rootEl || this.container?.host || this.container

    applyThemeSettings(themeTarget, this.settings)
    this.applySidebarWidthPreference(themeTarget)

    if (typo.fontFamily) article.style.fontFamily = 'var(--mdp-font-family)'
    if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
    if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
    if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'
  }

  /**
   * Re-apply sidebar width after theme (which sets `--mdp-toc-width` from settings) so session
   * drag width wins — same resolution as `useSidebarResize`.
   * @param {HTMLElement | ShadowRoot} themeTarget
   */
  applySidebarWidthPreference(themeTarget) {
    if (!themeTarget?.style) return
    const layout = this.settings?.layout || {}
    const storedWidth = getSidebarWidthPx()
    const layoutWidth = Number(layout.tocWidth)
    const baseWidth = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
    const width = clampSidebarWidth(Number.isFinite(baseWidth) ? baseWidth : 280)
    themeTarget.style.setProperty('--mdp-toc-width', `${width}px`)
  }

  getScrollRoot() {
    return this._rootEl || this._articleEl?.closest?.('.mdp-root') || null
  }

  /**
   * Allows optional plugins to inject runtime CSS once (e.g. KaTeX).
   * @param {{ id?: string, cssText?: string }} payload
   */
  injectViewerStyles(payload = {}) {
    const styleId = String(payload.id || '').trim()
    const cssText = String(payload.cssText || '')
    if (!styleId || !cssText) return
    if (this._runtimeStyleElements.has(styleId)) return
    const styleEl = createStyleElement(cssText)
    styleEl.setAttribute('data-mdp-runtime-style', styleId)
    this.container.appendChild(styleEl)
    this._runtimeStyleElements.set(styleId, styleEl)
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
      result = await renderDocument(this.markdown, this.settings, {
        injectViewerStyles: (payload) => this.injectViewerStyles(payload)
      })
    } catch (error) {
      logger.error('Failed to render markdown document.', error)
      return null
    }

    if (renderToken !== this._renderToken) return null
    const article = this._articleEl
    if (!article) return null

    renderIntoElement(article, result.html)
    if (renderToken !== this._renderToken) return null

    await result.pluginManager?.afterRender({
      articleEl: article,
      settings: this.settings,
      copyCodeWithToast: this._articleInteractions?.copyCodeWithToast.bind(this._articleInteractions)
    })
    if (renderToken !== this._renderToken) return null

    this.syncTocItems()
    if (scrollSnapshot) {
      this.restoreScrollPosition(scrollSnapshot)
    } else if (honorHash) {
      const behavior = this._smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
      this._articleInteractions?.scrollToHash({ behavior })
      if (this._smoothInitialHashScroll) this._smoothInitialHashScroll = false
    }

    return result
  }

  showToast(message) {
    this._reactHandle?.showToast(message)
  }

  syncTocItems() {
    const showToc = this.settings?.layout?.showToc !== false
    if (!showToc) {
      this._reactHandle?.updateChromeState?.({ tocItems: [] })
      return
    }

    const items = buildTocItems(this._articleEl)
    this._reactHandle?.updateChromeState?.({ tocItems: items })
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
    if (this._destroyed) return
    this._destroyed = true
    this._articleInteractions?.destroy()
    this._articleInteractions = null
    this._reactHandle?.unmount()
    this._reactHandle = null
    this._styleElements = []
    this._runtimeStyleElements.clear()
    this.container.innerHTML = ''
    this._rootEl = null
    this._articleEl = null
    logger.debug('Markdown viewer destroyed.')
  }
}
