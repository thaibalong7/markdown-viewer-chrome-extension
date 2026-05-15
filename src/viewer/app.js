import { renderDocument, renderIntoElement } from './core/renderer.js'
import { buildTocItems } from './core/toc-builder.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { needsFullRender } from '../shared/settings-diff.js'
import { createArticleInteractions } from './article-interactions.js'
import { resolveMarkdownLink } from './navigation/link-resolver.js'
import { mountViewerReact } from './react/mount.js'
import { getSidebarWidthPx } from './explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../shared/constants/viewer.js'
import {
  findLineForHeadingText,
  computePreviewScrollTarget,
  smoothScrollPreviewTo,
  cancelSmoothScroll
} from './editor/scroll-sync.js'
import { EDITOR_LINE_HEIGHT, normalizeEditorSettings } from '../shared/constants/editor.js'
import { saveFile, getSuggestedFilenameFromUrl, FileMismatchError } from './editor/file-io.js'

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

/** Time after the last user gesture on the preview before editor→preview sync runs again. */
const PREVIEW_USER_SCROLL_END_MS = 2000

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
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._editorDebounceTimer = null
    /** @type {number | null} */
    this._editorScrollRaf = null
    this._lastSuccessfulRenderMarkdown = ''
    /** @type {null | { topLine0Float: number, scrollFraction: number }} */
    this._editorScrollPayload = null
    /** @type {null | { scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }} */
    this._editorApi = null
    this._previewUserScrolling = false
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._previewUserScrollEndTimer = null
    /** @type {HTMLElement | null} */
    this._splitScrollContentPane = null
    /** @type {HTMLElement | null} */
    this._splitScrollEditorScrollEl = null
    this._currentFileUrl = window.location.href
    this._editModeActive = false
    this._editorDirty = false
    this._saveInFlight = false
    /** @type {'saved' | 'modified' | 'saving'} */
    this._saveStatus = 'saved'
    /** @type {HTMLElement | ShadowRoot | null} */
    this._keydownRoot = null
    this._onBeforeUnload = (event) => {
      if (!this._editorDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    this._onGlobalKeyDown = (event) => {
      if (this._destroyed || !this._editModeActive) return
      const key = String(event.key || '').toLowerCase()
      if (key !== 's' || !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      event.stopPropagation()
      void this._handleSave()
    }
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    this._destroyed = false
  }

  async init() {
    this._styleElements = this.styles.map(createStyleElement)
    for (const styleElement of this._styleElements) {
      this.container.appendChild(styleElement)
    }

    const explorerBridge = {
      getSettings: () => this.settings,
      setMarkdown: (md) => {
        if (this._editorDebounceTimer) {
          clearTimeout(this._editorDebounceTimer)
          this._editorDebounceTimer = null
        }
        this.markdown = md
        this._reactHandle?.updateMarkdown(md)
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
      },
      navigateToFile: null,
      virtualFileExists: null
    }

    this._reactHandle = mountViewerReact(this.container, {
      settings: this.settings,
      tocItems: [],
      tocReady: false,
      explorerBridge,
      markdown: this.markdown,
      getArticleEl: () => this._articleEl,
      getSettings: () => this.settings,
      getCurrentFileUrl: () => this._currentFileUrl,
      onContentChange: (next) => {
        this._handleEditorChange(next)
      },
      onEditorReady: (api) => {
        this._editorApi = api
        this._bindSplitScrollSync(api)
      },
      onEditorDestroy: () => {
        this._unbindSplitScrollSync()
        this._editorApi = null
      },
      onEditorScroll: (payload) => {
        this._handleEditorScroll(payload)
      },
      onTocClickInEditor: (headingText) => {
        this._handleTocClickInEditor(headingText)
      },
      onEditModeChange: (enabled) => {
        this._setEditModeActive(enabled)
      },
      onSave: () => {
        void this._handleSave()
      }
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
      getScrollRoot: () => this.getScrollRoot(),
      getCurrentFileUrl: () => this._currentFileUrl,
      navigateToFile: (fileUrl, opts) => explorerBridge.navigateToFile?.(fileUrl, opts),
      resolveLink: (rawHref) =>
        resolveMarkdownLink(rawHref, {
          currentFileUrl: this._currentFileUrl,
          virtualFileExists: (href) => explorerBridge.virtualFileExists?.(href) ?? false
        })
    })

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this._articleInteractions.bind()
    this._bindGlobalListeners()
  }

  _bindGlobalListeners() {
    this._unbindGlobalListeners()
    window.addEventListener('beforeunload', this._onBeforeUnload)
    const root =
      this.container instanceof ShadowRoot
        ? this.container
        : this.container?.host instanceof HTMLElement
          ? this.container.host.getRootNode()
          : document
    this._keydownRoot = root instanceof ShadowRoot || root instanceof Document ? root : document
    this._keydownRoot.addEventListener('keydown', this._onGlobalKeyDown, true)
  }

  _unbindGlobalListeners() {
    window.removeEventListener('beforeunload', this._onBeforeUnload)
    if (this._keydownRoot) {
      this._keydownRoot.removeEventListener('keydown', this._onGlobalKeyDown, true)
      this._keydownRoot = null
    }
  }

  _setEditorDirty(dirty) {
    const next = Boolean(dirty)
    if (this._editorDirty === next) return
    this._editorDirty = next
    this._reactHandle?.setDirty?.(next)
    this._syncSaveStatus()
  }

  _syncSaveStatus() {
    /** @type {'saved' | 'modified' | 'saving'} */
    const next = this._saveInFlight ? 'saving' : this._editorDirty ? 'modified' : 'saved'
    if (this._saveStatus === next) return
    this._saveStatus = next
    this._reactHandle?.setSaveStatus?.(next)
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
    if (this._editModeActive) {
      this._applyEditModeOverrides()
    } else {
      if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
      if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
    }
    if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'
  }

  /**
   * @param {boolean} enabled
   */
  _setEditModeActive(enabled) {
    this._editModeActive = Boolean(enabled)
    if (this._editModeActive) {
      this._applyEditModeOverrides()
      return
    }
    this._setEditorDirty(false)
    this.applyReaderStyles()
  }

  _applyEditModeOverrides() {
    const article = this._articleEl
    if (!article) return
    const editorSettings = normalizeEditorSettings(this.settings?.editor)
    article.style.fontSize = `${editorSettings.fontSize}px`
    article.style.lineHeight = String(EDITOR_LINE_HEIGHT)
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
    if (this._editorApi) {
      const contentPane = this._articleEl?.closest?.('.mdp-content-pane')
      if (contentPane) {
        return contentPane
      }
    }
    return this._rootEl || this._articleEl?.closest?.('.mdp-root') || null
  }

  /**
   * User is gesturing on the preview pane (wheel / touch). Stop smooth sync, drop pending RAF,
   * and pause editor→preview sync until idle or until the user scrolls the editor.
   */
  _onPreviewUserIntent = () => {
    if (this._destroyed) return
    const contentPane = this._articleEl?.closest?.('.mdp-content-pane')
    if (contentPane) {
      cancelSmoothScroll(contentPane)
    }
    if (this._editorScrollRaf != null) {
      cancelAnimationFrame(this._editorScrollRaf)
      this._editorScrollRaf = null
    }
    this._editorScrollPayload = null
    this._previewUserScrolling = true
    if (this._previewUserScrollEndTimer) {
      clearTimeout(this._previewUserScrollEndTimer)
    }
    this._previewUserScrollEndTimer = setTimeout(() => {
      this._previewUserScrollEndTimer = null
      this._previewUserScrolling = false
    }, PREVIEW_USER_SCROLL_END_MS)
  }

  /**
   * User is gesturing on the editor scroller — resume editor→preview sync immediately.
   */
  _onEditorUserIntent = () => {
    if (this._destroyed) return
    if (this._previewUserScrollEndTimer) {
      clearTimeout(this._previewUserScrollEndTimer)
      this._previewUserScrollEndTimer = null
    }
    this._previewUserScrolling = false
  }

  /**
   * @param {{ scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }} api
   */
  _bindSplitScrollSync(api) {
    this._unbindSplitScrollSync()
    const contentPane = this._articleEl?.closest?.('.mdp-content-pane')
    const scrollDom = api?.scrollDOM
    if (!(contentPane instanceof HTMLElement)) return
    this._splitScrollContentPane = contentPane
    contentPane.addEventListener('wheel', this._onPreviewUserIntent, { passive: true })
    contentPane.addEventListener('touchstart', this._onPreviewUserIntent, { passive: true })
    if (scrollDom instanceof HTMLElement) {
      this._splitScrollEditorScrollEl = scrollDom
      scrollDom.addEventListener('wheel', this._onEditorUserIntent, { passive: true })
      scrollDom.addEventListener('touchstart', this._onEditorUserIntent, { passive: true })
    }
  }

  _unbindSplitScrollSync() {
    if (this._previewUserScrollEndTimer) {
      clearTimeout(this._previewUserScrollEndTimer)
      this._previewUserScrollEndTimer = null
    }
    this._previewUserScrolling = false
    if (this._splitScrollContentPane) {
      this._splitScrollContentPane.removeEventListener('wheel', this._onPreviewUserIntent, { passive: true })
      this._splitScrollContentPane.removeEventListener('touchstart', this._onPreviewUserIntent, { passive: true })
      this._splitScrollContentPane = null
    }
    if (this._splitScrollEditorScrollEl) {
      this._splitScrollEditorScrollEl.removeEventListener('wheel', this._onEditorUserIntent, { passive: true })
      this._splitScrollEditorScrollEl.removeEventListener('touchstart', this._onEditorUserIntent, { passive: true })
      this._splitScrollEditorScrollEl = null
    }
  }

  /**
   * @param {string} nextMarkdown
   */
  _handleEditorChange(nextMarkdown) {
    if (this._destroyed) return
    this.markdown = typeof nextMarkdown === 'string' ? nextMarkdown : ''
    this._setEditorDirty(true)
    if (this._editorDebounceTimer) {
      clearTimeout(this._editorDebounceTimer)
    }
    this._editorDebounceTimer = setTimeout(() => {
      this._editorDebounceTimer = null
      if (this._destroyed) return
      if (this.markdown === this._lastSuccessfulRenderMarkdown) {
        return
      }
      void this.render({ preserveScroll: true, honorHash: false })
    }, 300)
  }

  /**
   * @param {{ topLine0Float?: number, scrollFraction?: number }} [payload]
   */
  _handleEditorScroll(payload) {
    if (this._destroyed || !payload) return
    if (this._previewUserScrolling) return
    this._editorScrollPayload = {
      topLine0Float: Number.isFinite(payload.topLine0Float) ? /** @type {number} */ (payload.topLine0Float) : 0,
      scrollFraction: Math.min(1, Math.max(0, Number(payload.scrollFraction) || 0))
    }
    if (this._editorScrollRaf != null) return
    this._editorScrollRaf = requestAnimationFrame(() => {
      this._editorScrollRaf = null
      if (this._destroyed) return
      if (this._previewUserScrolling) return
      const p = this._editorScrollPayload
      this._editorScrollPayload = null
      if (!p) return
      const contentPane = this._articleEl?.closest?.('.mdp-content-pane')
      if (!contentPane) return
      const target = computePreviewScrollTarget(p.topLine0Float, contentPane, p.scrollFraction)
      smoothScrollPreviewTo(contentPane, target)
    })
  }

  /**
   * @param {string} headingText
   */
  async _handleSave() {
    if (this._destroyed || this._saveInFlight) return
    if (!this._editModeActive) return

    this._saveInFlight = true
    this._syncSaveStatus()
    try {
      const content = this.markdown
      const fileUrl = this._currentFileUrl || window.location.href
      const suggestedName = getSuggestedFilenameFromUrl(fileUrl)
      const result = await saveFile(content, { fileUrl, suggestedName })

      if (result === 'cancelled') {
        return
      }

      this._setEditorDirty(false)
      if (result === 'fsa') {
        this.showToast('Saved')
      } else {
        this.showToast('Downloaded copy (save to original file via picker next time)')
      }
    } catch (error) {
      if (error instanceof FileMismatchError) {
        this.showToast(error.message)
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to save markdown file.', error)
      this.showToast(message ? `Save failed: ${message}` : 'Save failed.')
    } finally {
      this._saveInFlight = false
      this._syncSaveStatus()
    }
  }

  _handleTocClickInEditor(headingText) {
    if (this._destroyed) return
    if (typeof headingText !== 'string' || !headingText) return
    const line = findLineForHeadingText(this.markdown, headingText)
    if (line == null) return
    this._editorApi?.scrollToLine?.(line)
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
    this._reactHandle?.setTocReady?.(false)
    const renderToken = ++this._renderToken
    const scrollSnapshot = preserveScroll ? this.captureScrollPosition() : null
    let result
    try {
      result = await renderDocument(this.markdown, this.settings, {
        injectViewerStyles: (payload) => this.injectViewerStyles(payload)
      })
    } catch (error) {
      logger.error('Failed to render markdown document.', error)
      this._reactHandle?.setTocReady?.(true)
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

    this._lastSuccessfulRenderMarkdown = this.markdown

    return result
  }

  showToast(message) {
    this._reactHandle?.showToast(message)
  }

  syncTocItems() {
    const showToc = this.settings?.layout?.showToc !== false
    if (!showToc) {
      this._reactHandle?.updateChromeState?.({ tocItems: [] })
      this._reactHandle?.setTocReady?.(true)
      return
    }

    const items = buildTocItems(this._articleEl)
    this._reactHandle?.updateChromeState?.({ tocItems: items })
    this._reactHandle?.setTocReady?.(true)
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
    this._unbindGlobalListeners()
    this._unbindSplitScrollSync()
    if (this._editorDebounceTimer) {
      clearTimeout(this._editorDebounceTimer)
      this._editorDebounceTimer = null
    }
    if (this._editorScrollRaf != null) {
      cancelAnimationFrame(this._editorScrollRaf)
      this._editorScrollRaf = null
    }
    this._editorScrollPayload = null
    this._editorApi = null
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
