import { logger } from '../shared/logger.js'
import { needsFullRender } from '../shared/settings-diff.js'
import { createArticleInteractions } from './article-interactions.js'
import { resolveMarkdownLink } from './navigation/link-resolver.js'
import { mountViewerReact } from './react/mount.js'
import { findLineForHeadingText } from './editor/scroll-sync.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { fileHistoryTitleFromUrl, normalizeFileHistoryUrl } from '../shared/file-history.js'
import { createExplorerBridge } from './app/createExplorerBridge.js'
import { createEditorSessionController } from './app/editorSessionController.js'
import { createRenderController } from './app/renderController.js'
import { createSplitScrollSync } from './app/splitScrollSync.js'
import { applyReaderStyles, createStyleElement } from './app/viewerStyles.js'
import { createGlobalViewerListeners } from './app/globalViewerListeners.js'

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
    this._styleElements = []
    this._reactHandle = null
    /** @type {null | { scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }} */
    this._editorApi = null
    this._currentFileUrl = window.location.href
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    this._renderController = createRenderController({
      getMarkdown: () => this.markdown,
      getSettings: () => this.settings,
      getArticleEl: () => this._articleEl,
      getArticleInteractions: () => this._articleInteractions,
      getReactHandle: () => this._reactHandle,
      getScrollRoot: () => this.getScrollRoot(),
      container: this.container
    })
    this._editorSession = createEditorSessionController({
      isDestroyed: () => this._destroyed,
      getMarkdown: () => this.markdown,
      setMarkdown: (nextMarkdown) => {
        this.markdown = nextMarkdown
      },
      getLastSuccessfulRenderMarkdown: () => this._renderController.getLastSuccessfulRenderMarkdown(),
      render: (opts) => this.render(opts),
      getReactHandle: () => this._reactHandle,
      getCurrentFileUrl: () => this._currentFileUrl,
      showToast: (message) => this.showToast(message),
      applyReaderStyles: () => this.applyReaderStyles(),
      getArticleEl: () => this._articleEl,
      getSettings: () => this.settings
    })
    this._splitScrollSync = createSplitScrollSync({
      isDestroyed: () => this._destroyed,
      getArticleEl: () => this._articleEl
    })
    this._globalListeners = createGlobalViewerListeners({
      container: this.container,
      isDestroyed: () => this._destroyed,
      hasUnsavedChanges: () => this._editorSession.isDirty(),
      canSave: () => this._editorSession.isEditModeActive(),
      onSave: () => {
        void this._editorSession.handleSave()
      }
    })
    this._destroyed = false
  }

  async init() {
    this._styleElements = this.styles.map(createStyleElement)
    for (const styleElement of this._styleElements) {
      this.container.appendChild(styleElement)
    }

    const explorerBridge = createExplorerBridge({
      getSettings: () => this.settings,
      setMarkdown: (md) => this._editorSession.setExternalMarkdown(md),
      setSmoothInitialHashScroll: (value) => this._renderController.setSmoothInitialHashScroll(value),
      render: (opts) => this.render(opts),
      showToast: (message) => this.showToast(message),
      getScrollRoot: () => this.getScrollRoot(),
      getArticleEl: () => this._articleEl,
      getCurrentFileUrl: () => this._currentFileUrl,
      updateCurrentFileUrl: (nextUrl) => {
        this._currentFileUrl = typeof nextUrl === 'string' ? nextUrl : ''
        this._recordCurrentFileInHistory()
        this._reactHandle?.bumpChrome()
      }
    })

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
        this._editorSession.handleEditorChange(next)
      },
      onEditorReady: (api) => {
        this._editorApi = api
        this._splitScrollSync.bind(api)
      },
      onEditorDestroy: () => {
        this._splitScrollSync.unbind()
        this._editorApi = null
      },
      onEditorScroll: (payload) => {
        this._splitScrollSync.handleEditorScroll(payload)
      },
      onTocClickInEditor: (headingText) => {
        this._handleTocClickInEditor(headingText)
      },
      onEditModeChange: (enabled) => {
        this._editorSession.setEditModeActive(enabled)
      },
      onSave: () => {
        void this._editorSession.handleSave()
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

    this._renderController.setSmoothInitialHashScroll(Boolean(window.location.hash))
    this.applyReaderStyles()
    this._recordCurrentFileInHistory()
    void this.render()
    this._articleInteractions.bind()
    this._globalListeners.bind()
  }

  _recordCurrentFileInHistory() {
    const url = normalizeFileHistoryUrl(this._currentFileUrl)
    if (!url) return
    void sendMessage({
      type: MESSAGE_TYPES.RECORD_FILE_OPENED,
      payload: {
        url,
        title: fileHistoryTitleFromUrl(url)
      }
    }).catch((error) => {
      logger.debug('Could not record file history.', error)
    })
  }

  applyReaderStyles() {
    applyReaderStyles({
      article: this._articleEl,
      root: this._rootEl,
      container: this.container,
      settings: this.settings,
      editModeActive: this._editorSession.isEditModeActive()
    })
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

  _handleTocClickInEditor(headingText) {
    if (this._destroyed) return
    if (typeof headingText !== 'string' || !headingText) return
    const line = findLineForHeadingText(this.markdown, headingText)
    if (line == null) return
    this._editorApi?.scrollToLine?.(line)
  }

  async render(opts = {}) {
    return this._renderController.render(opts)
  }

  showToast(message) {
    this._reactHandle?.showToast(message)
  }

  syncTocItems() {
    this._renderController.syncTocItems()
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
    this._globalListeners.unbind()
    this._splitScrollSync.destroy()
    this._editorSession.destroy()
    this._renderController.destroy()
    this._editorApi = null
    this._articleInteractions?.destroy()
    this._articleInteractions = null
    this._reactHandle?.unmount()
    this._reactHandle = null
    this._styleElements = []
    this.container.innerHTML = ''
    this._rootEl = null
    this._articleEl = null
    logger.debug('Markdown viewer destroyed.')
  }
}
