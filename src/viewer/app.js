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
import { createDocumentSessionController } from './app/documentSessionController.js'
import { createDocumentIdentity } from './documents/document-model.js'
import { getExplorerMode } from './explorer/explorer-state.js'
import { documentTitleFromUrl } from './explorer/url-utils.js'
import {
  buildDirectFileSectionUrl,
  buildViewerRouteUrl,
  parseViewerRoute,
  writeViewerRoute
} from './navigation/viewer-route.js'

export class MarkdownViewerApp {
  /**
   * @param {object} options
   * @param {string} options.markdown
   * @param {object} [options.initialDocument]
   * @param {object} [options.initialRoute]
   * @param {object} options.settings
   * @param {HTMLElement} options.container
   * @param {string[]} [options.styles]
   */
  constructor({ markdown, initialDocument, initialRoute, settings, container, styles = [] } = {}) {
    this.markdown = markdown
    this.settings = settings
    this.container = container
    this.styles = styles
    /** @type {HTMLElement | null} */
    this._rootEl = null
    /** @type {HTMLElement | null} */
    this._articleEl = null
    this._styleElements = []
    /** @type {HTMLElement | null} */
    this._reactContainerEl = null
    this._reactHandle = null
    /** @type {null | { scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }} */
    this._editorApi = null
    this._initialRoute = initialRoute || parseViewerRoute(window.location.href)
    this._entryFileUrl = this._initialRoute?.entryFileUrl || window.location.href
    this._currentFileUrl = this._entryFileUrl
    this._initialRouteWarning = null
    const currentDocument = initialDocument || createDocumentIdentity(this._currentFileUrl)
    this._initialLoadedDocument = {
      document: currentDocument,
      text: typeof markdown === 'string' ? markdown : '',
      assetUrl: null,
      revokeAssetUrl: null
    }
    this._documentSession = null
    /** @type {ReturnType<typeof createArticleInteractions> | null} */
    this._articleInteractions = null
    this._renderController = createRenderController({
      getLoadedDocument: () => this._documentSession?.getLoadedDocument() || this._initialLoadedDocument,
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
        this._documentSession?.updateText(nextMarkdown)
      },
      getLastSuccessfulRenderMarkdown: () => this._renderController.getLastSuccessfulRenderMarkdown(),
      render: (opts) => this.render(opts),
      getReactHandle: () => this._reactHandle,
      getCurrentFileUrl: () => this._currentFileUrl,
      showToast: (message, options) => this.showToast(message, options),
      applyReaderStyles: () => this.applyReaderStyles(),
      getArticleEl: () => this._articleEl,
      getSettings: () => this.settings,
      canEditCurrentDocument: () => {
        const state = this._documentSession?.getUiState()
        return state?.capabilities?.edit === true && state?.sourceKind === 'file-url'
      }
    })
    this._documentSession = createDocumentSessionController({
      initialDocument: currentDocument,
      initialText: this.markdown,
      render: (opts) => this.render(opts),
      beforeDocumentSwitch: () => this._editorSession.prepareForDocumentSwitch(),
      onDocumentSwitchStart: () => this._articleInteractions?.closeImageLightbox(),
      onDocumentLoaded: (loadedDocument) => {
        this.markdown = String(loadedDocument?.text ?? '')
        this._editorSession.setExternalMarkdown(this.markdown)
      },
      onCurrentDocumentChange: (document) => {
        this._currentFileUrl = document?.href || ''
        if (document) this._recordCurrentFileInHistory()
        this._reactHandle?.bumpChrome()
      },
      publishUiState: (documentUiState) => {
        if (documentUiState?.loading) this._articleEl?.setAttribute('aria-busy', 'true')
        else this._articleEl?.removeAttribute('aria-busy')
        this._reactHandle?.updateDocumentUiState?.(documentUiState)
      },
      showToast: (message, options) => this.showToast(message, options)
    })
    this._splitScrollSync = createSplitScrollSync({
      isDestroyed: () => this._destroyed,
      getArticleEl: () => this._articleEl
    })
    this._globalListeners = createGlobalViewerListeners({
      container: this.container,
      isDestroyed: () => this._destroyed,
      hasUnsavedChanges: () => this._editorSession.isDirty(),
      canSave: () =>
        this._editorSession.isEditModeActive() &&
        this._documentSession.getUiState().capabilities?.edit === true,
      onSave: () => {
        void this._editorSession.handleSave()
      },
      onViewModeChange: (viewMode) => {
        void this._documentSession.setViewMode(viewMode)
      }
    })
    this._destroyed = false
  }

  async init() {
    this._styleElements = this.styles.map(createStyleElement)
    for (const styleElement of this._styleElements) {
      this.container.appendChild(styleElement)
    }

    await this._restoreInitialRoute()

    this._reactContainerEl = document.createElement('div')
    this._reactContainerEl.className = 'mdp-react-root'
    this.container.appendChild(this._reactContainerEl)

    const explorerBridge = createExplorerBridge({
      getSettings: () => this.settings,
      setSmoothInitialHashScroll: (value) => this._renderController.setSmoothInitialHashScroll(value),
      openDocument: (href, opts) => this._documentSession.openDocument(href, opts),
      showPlaceholder: (text) => this._documentSession.showPlaceholder(text),
      showToast: (message, options) => this.showToast(message, options),
      getScrollRoot: () => this.getScrollRoot(),
      getArticleEl: () => this._articleEl,
      getCurrentFileUrl: () => this._currentFileUrl,
      getEntryFileUrl: () => this._entryFileUrl,
      resetBrowserRoute: () => this._resetBrowserRoute(),
      updateCurrentFileUrl: (nextUrl) => {
        const url = typeof nextUrl === 'string' ? nextUrl : ''
        if (url === this._currentFileUrl) return
        this._currentFileUrl = url
        this._recordCurrentFileInHistory()
        this._reactHandle?.bumpChrome()
      }
    })

    this._reactHandle = mountViewerReact(this._reactContainerEl, {
      settings: this.settings,
      tocItems: [],
      tocReady: false,
      explorerBridge,
      markdown: this.markdown,
      documentUiState: this._documentSession.getUiState(),
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
      onHeadingNavigate: (headingId) => {
        this._updateDocumentHeading(headingId)
        this._articleInteractions?.scrollToHash({ behavior: 'smooth', hash: headingId })
      },
      onEditModeChange: (enabled) => {
        this._editorSession.setEditModeActive(enabled)
      },
      onSave: () => {
        void this._editorSession.handleSave()
      },
      onViewModeChange: (viewMode) => {
        void this._documentSession.setViewMode(viewMode)
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
      showToast: (message, options) => this.showToast(message, options),
      getScrollRoot: () => this.getScrollRoot(),
      navigateToFile: (fileUrl, opts) => explorerBridge.navigateToFile?.(fileUrl, opts),
      updateDocumentHeading: (headingId) => this._updateDocumentHeading(headingId),
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
    if (this._initialRouteWarning) {
      this.showToast(this._initialRouteWarning, { variant: 'warning' })
      this._initialRouteWarning = null
    }
  }

  async _restoreInitialRoute() {
    if (this._initialRoute?.invalidFileTarget || getExplorerMode() === 'workspace') {
      this._resetBrowserRoute()
      if (this._initialRoute?.invalidFileTarget) {
        this._initialRouteWarning = 'The file route in this URL is not supported'
      }
    } else if (this._initialRoute?.hasFileTarget) {
      const restored = await this._documentSession.openDocument(this._initialRoute.targetFileUrl)
      if (!restored) {
        this._resetBrowserRoute()
        this._initialRouteWarning =
          'Could not restore the linked file; returned to the original file'
      } else {
        document.title = `${documentTitleFromUrl(this._currentFileUrl)} - Markdown Plus`
      }
    }
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

  _resetBrowserRoute() {
    try {
      return writeViewerRoute({
        entryFileUrl: this._entryFileUrl,
        currentFileUrl: this._entryFileUrl,
        replace: true
      })
    } catch {
      return null
    }
  }

  _updateDocumentHeading(headingId) {
    if (getExplorerMode() === 'workspace') {
      return buildDirectFileSectionUrl(this._currentFileUrl, headingId)
    }
    try {
      return writeViewerRoute({
        entryFileUrl: this._entryFileUrl,
        currentFileUrl: this._currentFileUrl,
        hash: headingId,
        replace: true
      })
    } catch {
      return buildViewerRouteUrl({
        entryFileUrl: this._entryFileUrl,
        currentFileUrl: this._currentFileUrl,
        hash: headingId
      })
    }
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

  showToast(message, options) {
    this._reactHandle?.showToast(message, options)
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
    this._documentSession.destroy()
    this._renderController.destroy()
    this._editorApi = null
    this._articleInteractions?.destroy()
    this._articleInteractions = null
    this._reactHandle?.unmount()
    this._reactHandle = null
    this._styleElements = []
    this._reactContainerEl = null
    this.container.innerHTML = ''
    this._rootEl = null
    this._articleEl = null
    logger.debug('Markdown viewer destroyed.')
  }
}
