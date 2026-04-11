import { createShell } from './shell/viewer-shell.js'
import { renderDocument, renderIntoElement } from './core/renderer.js'
import { rebuildToc } from './actions/rebuild-toc.js'
import { applyThemeSettings } from '../theme/index.js'
import { logger } from '../shared/logger.js'
import { copyTextToClipboard } from '../shared/clipboard.js'
import { dismissViewerToast, showViewerToast } from './toast.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from './toolbar-metrics.js'
import { scanFolderRecursive } from './explorer/folder-scanner.js'
import {
  fileUrlIsUnderDirectoryUrl,
  getParentDirectoryPathLabel,
  getParentDirectoryUrl,
  isWorkspaceVirtualHref,
  MDP_WS_FILE,
  normalizeDirectoryUrl,
  normalizeFileUrlForCompare,
  scanSiblingFiles
} from './explorer/sibling-scanner.js'
import {
  pickFilesWithWebkitDirectory,
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList,
  tryFileDirectoryUrlFromWebkitFiles
} from './explorer/workspace-picker.js'
import {
  buildExplorerFilesContext,
  explorerTreeContainsFileHref,
  injectCurrentMarkdownAtRootIfMissing
} from './explorer/explorer-files-context.js'
import { createExplorerPanel } from './explorer/explorer-panel.js'
import { attachTooltip } from './tooltip.js'
import {
  clearWorkspaceRootUrl,
  getActiveSidebarTab,
  getExplorerMode,
  getOriginalFileUrl,
  getSidebarWidthPx,
  getWorkspaceRootUrl,
  isOnOriginalFile,
  setActiveSidebarTab,
  setExplorerMode,
  setOriginalFileUrlIfUnset,
  setSidebarWidthPx,
  setWorkspaceRootUrl
} from './explorer/explorer-state.js'

const SIDEBAR_MIN_WIDTH_PX = 220
const SIDEBAR_MAX_WIDTH_PX = 520

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
    this.hashChangeHandler = null
    this.articleHashLinkClickHandler = null
    this._smoothInitialHashScroll = false
    this._renderToken = 0
    /** @type {ReturnType<typeof createExplorerPanel> | null} */
    this._explorerPanel = null
    this._tabFilesClick = null
    this._tabOutlineClick = null
    this._currentFileUrl = window.location.href
    this._sidebarResizePointerDown = null
    this._sidebarResizePointerMove = null
    this._sidebarResizePointerUp = null
    this._sidebarResizeKeyDown = null
    /** @type {(() => void) | null} */
    this._resizeHandleTooltipDestroy = null
    /** @type {'sibling' | 'workspace'} */
    this._explorerMode = 'sibling'
    /** @type {import('./explorer/folder-scanner.js').ExplorerTreeNode | null} */
    this._workspaceTree = null
    /** Deep folder tree when explorerMode is sibling (parent of current file) */
    /** @type {import('./explorer/folder-scanner.js').ExplorerTreeNode | null} */
    this._siblingTree = null
    /** Decoded parent directory path label for Files context strip in sibling mode */
    this._siblingFolderLabel = ''
    /** Normalized file: directory URL for the root of the current sibling deep tree (null if flat list) */
    this._siblingScanRootUrl = null
    /** @type {AbortController | null} */
    this._scanAbortController = null
    /** @type {Map<string, File | FileSystemFileHandle> | null} */
    this._workspaceVirtualReaders = null
    /** Human label for workspace root (tree title / folder name) for Files context strip */
    this._workspaceDisplayLabel = ''
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
    this._initExplorer()
    this._initSidebarResize()
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
      this._applySidebarWidth()
      const body = sidebar.parentElement
      if (body?.classList?.contains('mdp-body')) {
        body.classList.toggle('mdp-body--no-toc', !showToc)
      }
    }
  }

  _resolveSidebarWidth() {
    const layoutWidth = Number(this.settings?.layout?.tocWidth)
    const storedWidth = getSidebarWidthPx()
    const base = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
    const fallback = 280
    return this._clampSidebarWidth(Number.isFinite(base) ? base : fallback)
  }

  _clampSidebarWidth(widthPx) {
    const width = Number(widthPx)
    if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
    return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
  }

  _setSidebarWidth(widthPx, { persist = false } = {}) {
    const root = this.parts?.root
    if (!root) return
    const clamped = this._clampSidebarWidth(widthPx)
    root.style.setProperty('--mdp-toc-width', `${clamped}px`)
    const handle = this.parts?.resizeHandle
    if (handle) handle.setAttribute('aria-valuenow', String(clamped))
    if (persist) setSidebarWidthPx(clamped)
  }

  _applySidebarWidth() {
    this._setSidebarWidth(this._resolveSidebarWidth(), { persist: false })
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
      settings: this.settings,
      copyCodeWithToast: this.copyCodeWithToast.bind(this)
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
    showViewerToast(this.parts?.root, message)
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

  /**
   * @param {'files' | 'outline'} tabId
   */
  setSidebarTab(tabId) {
    const { tabFiles, tabOutline, filesPanel, outlinePanel } = this.parts || {}
    if (!tabFiles || !tabOutline || !filesPanel || !outlinePanel) return

    setActiveSidebarTab(tabId)
    const isFiles = tabId === 'files'
    filesPanel.hidden = !isFiles
    outlinePanel.hidden = isFiles
    tabFiles.classList.toggle('is-active', isFiles)
    tabOutline.classList.toggle('is-active', !isFiles)
    tabFiles.setAttribute('aria-selected', String(isFiles))
    tabOutline.setAttribute('aria-selected', String(!isFiles))
  }

  _applySidebarTabFromStorage() {
    this.setSidebarTab(getActiveSidebarTab())
  }

  /**
   * @param {object} [opts]
   * @param {'idle' | 'scanning'} [opts.scanPhase]
   * @param {string} [opts.workspaceDisplayLabel] - override label while scanning or before tree is ready
   * @returns {import('./explorer/explorer-files-context.js').ExplorerFilesContext}
   */
  _buildExplorerFilesContext(opts = {}) {
    const scanPhase = opts.scanPhase === 'scanning' ? 'scanning' : 'idle'
    const label =
      opts.workspaceDisplayLabel != null && String(opts.workspaceDisplayLabel).trim() !== ''
        ? String(opts.workspaceDisplayLabel).trim()
        : this._workspaceDisplayLabel || getWorkspaceRootUrl() || undefined

    const siblingFolderLabel =
      opts.siblingFolderLabel != null && String(opts.siblingFolderLabel).trim() !== ''
        ? String(opts.siblingFolderLabel).trim()
        : this._siblingFolderLabel || undefined

    return buildExplorerFilesContext({
      explorerMode: this._explorerMode,
      currentFileUrl: this._currentFileUrl,
      workspaceTree: this._workspaceTree,
      siblingTree: this._siblingTree,
      workspaceRootUrl: getWorkspaceRootUrl(),
      workspaceDisplayLabel: label,
      siblingFolderLabel,
      scanPhase
    })
  }

  _initExplorer() {
    const { explorerContainer, tabFiles, tabOutline } = this.parts || {}
    if (!explorerContainer || !tabFiles || !tabOutline) return

    if (getExplorerMode() === 'workspace' && !getWorkspaceRootUrl()) {
      setExplorerMode('sibling')
    }

    setOriginalFileUrlIfUnset(window.location.href)
    this._applySidebarTabFromStorage()

    this._explorerPanel = createExplorerPanel({
      container: explorerContainer,
      onNavigate: (href) => {
        void this._navigateToSiblingFile(href)
      },
      onOpenAnotherFolder: () => {
        this._openAnotherFolderDialog()
      },
      onExitWorkspace: () => {
        this._exitWorkspace()
      }
    })

    this._tabFilesClick = () => this.setSidebarTab('files')
    this._tabOutlineClick = () => this.setSidebarTab('outline')
    tabFiles.addEventListener('click', this._tabFilesClick)
    tabOutline.addEventListener('click', this._tabOutlineClick)

    const storedMode = getExplorerMode()
    const storedRoot = getWorkspaceRootUrl()
    if (storedMode === 'workspace' && storedRoot) {
      this._explorerMode = 'workspace'
      this._explorerPanel.showLoading({ filesContext: this._buildExplorerFilesContext() })
      void this._openWorkspaceFolder(storedRoot, { restore: true })
      return
    }

    this._explorerPanel.showLoading({ filesContext: this._buildExplorerFilesContext() })
    void this._runSiblingScan(this._currentFileUrl)
  }

  _abortWorkspaceScan() {
    if (this._scanAbortController) {
      try {
        this._scanAbortController.abort()
      } catch {
        /* ignore */
      }
      this._scanAbortController = null
    }
  }

  _openAnotherFolderDialog() {
    void this._pickAndOpenAnotherWorkspaceFolder()
  }

  _clearWorkspaceVirtualReaders() {
    this._workspaceVirtualReaders = null
  }

  async _pickAndOpenAnotherWorkspaceFolder() {
    if (!this._explorerPanel) return

    if (typeof window.showDirectoryPicker === 'function') {
      let handle
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' })
      } catch (error) {
        if (error?.name === 'AbortError') return
        logger.debug('showDirectoryPicker failed; trying webkitdirectory.', error)
      }
      if (handle) {
        // FileSystemDirectoryHandle cannot survive chrome.runtime.sendMessage
        // (degrades to a plain Object). Scan in the current tab instead.
        await this._openWorkspaceFromDirectoryHandle(handle)
        return
      }
    }

    const files = await pickFilesWithWebkitDirectory()
    if (!files?.length) return

    try {
      const dirUrl = tryFileDirectoryUrlFromWebkitFiles(files)
      if (dirUrl) {
        await this._openWorkspaceFolder(dirUrl)
      } else {
        await this._openWorkspaceFromVirtualWebkitFiles(files)
      }
    } catch (error) {
      logger.warn('Open workspace folder failed.', error)
      this.showToast(error?.message || 'Could not open folder')
    }
  }

  /**
   * @param {FileSystemDirectoryHandle} dirHandle
   */
  async _openWorkspaceFromDirectoryHandle(dirHandle) {
    if (!this._explorerPanel || !dirHandle) return

    this._siblingTree = null
    this._siblingFolderLabel = ''
    this._siblingScanRootUrl = null
    this._clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    this._abortWorkspaceScan()
    this._scanAbortController = new AbortController()
    const { signal } = this._scanAbortController

    const ex = this.settings?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth)) ? Number(ex.maxScanDepth) : 3
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : 2000
    const maxFolders = Number.isFinite(Number(ex.maxFolders)) ? Number(ex.maxFolders) : 500

    setExplorerMode('workspace')
    this._explorerMode = 'workspace'

    this._explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: dirHandle.name || '…',
      onCancel: () => this._scanAbortController?.abort(),
      progressHeadline: 'Scanning picked folder…',
      filesContext: this._buildExplorerFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: dirHandle.name || 'Folder'
      })
    })

    const failToSibling = async (message) => {
      this._explorerPanel?.clearExplorerBody()
      if (message) this.showToast(message)
      this._clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      setExplorerMode('sibling')
      this._explorerMode = 'sibling'
      this._workspaceTree = null
      this._workspaceDisplayLabel = ''
      await this._runSiblingScan(this._currentFileUrl)
    }

    try {
      const { tree, stats, readers } = await scanWorkspaceFromDirectoryHandle(dirHandle, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        currentFileUrl: this._currentFileUrl,
        onProgress: (p) => {
          this._explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })
      this._workspaceVirtualReaders = readers
      await this._finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: dirHandle.name || 'Workspace'
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace directory-handle scan failed.', error)
      if (aborted) {
        await failToSibling('')
      } else {
        await failToSibling('Could not scan folder')
      }
    } finally {
      this._scanAbortController = null
    }
  }

  /**
   * @param {File[]} files
   */
  async _openWorkspaceFromVirtualWebkitFiles(files) {
    if (!this._explorerPanel || !files?.length) return

    this._siblingTree = null
    this._siblingFolderLabel = ''
    this._siblingScanRootUrl = null
    this._clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    this._abortWorkspaceScan()
    this._scanAbortController = new AbortController()
    const { signal } = this._scanAbortController

    const ex = this.settings?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth)) ? Number(ex.maxScanDepth) : 3
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : 2000
    const maxFolders = Number.isFinite(Number(ex.maxFolders)) ? Number(ex.maxFolders) : 500

    setExplorerMode('workspace')
    this._explorerMode = 'workspace'

    this._explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: '…',
      onCancel: () => this._scanAbortController?.abort(),
      progressHeadline: 'Scanning imported folder…',
      filesContext: this._buildExplorerFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: 'Imported folder'
      })
    })

    const failToSibling = async (message) => {
      this._explorerPanel?.clearExplorerBody()
      if (message) this.showToast(message)
      this._clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      setExplorerMode('sibling')
      this._explorerMode = 'sibling'
      this._workspaceTree = null
      this._workspaceDisplayLabel = ''
      await this._runSiblingScan(this._currentFileUrl)
    }

    try {
      const { tree, stats, readers } = await scanWorkspaceFromWebkitFileList(files, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        onProgress: (p) => {
          this._explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })
      this._workspaceVirtualReaders = readers
      await this._finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: tree.name || 'Workspace'
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace webkitdirectory scan failed.', error)
      if (aborted) {
        await failToSibling('')
      } else {
        await failToSibling('Could not scan folder')
      }
    } finally {
      this._scanAbortController = null
    }
  }

  async _resetViewerToPickWorkspaceFile() {
    this.markdown = '# Select a file\n\nPick a Markdown file from the sidebar list.'
    this._currentFileUrl = ''
    this._smoothInitialHashScroll = false
    await this.render({ preserveScroll: false, honorHash: false })
    this.getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
    document.title = 'Markdown Plus'
  }

  /**
   * @param {import('./explorer/folder-scanner.js').ExplorerTreeNode} tree
   * @param {import('./explorer/folder-scanner.js').ScanFolderStats} stats
   * @param {{ maxScanDepth: number, folderLabel?: string }} opts
   */
  _finalizeSiblingTreePresent(tree, stats, opts) {
    if (!this._explorerPanel) return
    const { maxScanDepth, folderLabel } = opts

    this._siblingTree = tree
    try {
      this._siblingScanRootUrl = normalizeDirectoryUrl(tree.href)
    } catch {
      this._siblingScanRootUrl = null
    }
    if (folderLabel && String(folderLabel).trim()) {
      this._siblingFolderLabel = String(folderLabel).trim()
    }

    const { showBack, backLabel, onBack } = this._siblingBackNavigationForUrl(this._currentFileUrl)

    const listLabel = this._siblingFolderLabel || tree.name || 'Folder'

    this._explorerPanel.showTree(tree, {
      workspaceLabel: listLabel,
      stats,
      maxScanDepth,
      showBack,
      backLabel,
      onBack,
      actionsMode: 'sibling',
      listAriaLabel: 'Markdown files in folder tree',
      filesContext: this._buildExplorerFilesContext()
    })
    if (!this._currentFileUrl) {
      this._explorerPanel.markActiveFile('')
    } else {
      this._explorerPanel.markActiveFile(this._currentFileUrl)
    }
  }

  /**
   * @param {import('./explorer/folder-scanner.js').ExplorerTreeNode} tree
   * @param {import('./explorer/folder-scanner.js').ScanFolderStats} stats
   * @param {{ maxScanDepth: number, normalizedDirUrl?: string, workspaceLabelOverride?: string }} opts
   */
  async _finalizeWorkspaceTreePresent(tree, stats, opts) {
    if (!this._explorerPanel) return
    const { maxScanDepth, normalizedDirUrl, workspaceLabelOverride } = opts

    const rootForInject =
      (normalizedDirUrl && String(normalizedDirUrl)) || getWorkspaceRootUrl() || ''
    injectCurrentMarkdownAtRootIfMissing(
      tree,
      this._currentFileUrl,
      stats,
      rootForInject.startsWith('file:') ? rootForInject : undefined
    )

    this._workspaceTree = tree

    const rootNorm = rootForInject
    const cur = this._currentFileUrl
    let documentStillValid = false
    if (cur) {
      if (isWorkspaceVirtualHref(cur)) {
        documentStillValid = explorerTreeContainsFileHref(tree, cur)
      } else if (cur.startsWith('file:') && rootNorm.startsWith('file:')) {
        documentStillValid = fileUrlIsUnderDirectoryUrl(cur, rootNorm)
      }
    }
    if (cur && !documentStillValid) {
      await this._resetViewerToPickWorkspaceFile()
    }

    // Workspace mode: no “Back to …” — the tree is the picked folder, not a sibling escape hatch.
    const showBack = false

    let workspaceLabel = workspaceLabelOverride || tree.name || 'Workspace'
    if (normalizedDirUrl) {
      try {
        let p = new URL(normalizedDirUrl).pathname.replace(/\/+$/, '')
        try {
          workspaceLabel = decodeURIComponent(p) || workspaceLabel
        } catch {
          workspaceLabel = p || workspaceLabel
        }
      } catch {
        /* keep */
      }
    }

    this._workspaceDisplayLabel = workspaceLabel

    this._explorerPanel.showTree(tree, {
      workspaceLabel,
      stats,
      maxScanDepth,
      showBack,
      actionsMode: 'workspace',
      filesContext: this._buildExplorerFilesContext()
    })
    if (!this._currentFileUrl) {
      this._explorerPanel.markActiveFile('')
    } else {
      this._explorerPanel.markActiveFile(this._currentFileUrl)
    }
  }

  /**
   * @param {string} dirUrl
   * @param {{ restore?: boolean }} [opts]
   */
  async _openWorkspaceFolder(dirUrl, opts = {}) {
    const { restore = false } = opts
    if (!this._explorerPanel || !dirUrl) return

    const normalized = normalizeDirectoryUrl(dirUrl)
    this._siblingTree = null
    this._siblingFolderLabel = ''
    this._siblingScanRootUrl = null
    this._clearWorkspaceVirtualReaders()
    this._abortWorkspaceScan()
    this._scanAbortController = new AbortController()
    const { signal } = this._scanAbortController

    const ex = this.settings?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth)) ? Number(ex.maxScanDepth) : 3
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : 2000
    const maxFolders = Number.isFinite(Number(ex.maxFolders)) ? Number(ex.maxFolders) : 500

    setExplorerMode('workspace')
    setWorkspaceRootUrl(normalized)
    this._explorerMode = 'workspace'

    let scanContextLabel = normalized
    try {
      const p = new URL(normalized).pathname.replace(/\/+$/, '')
      scanContextLabel = decodeURIComponent(p) || scanContextLabel
    } catch {
      /* keep */
    }

    this._explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: normalized,
      onCancel: () => this._scanAbortController?.abort(),
      progressHeadline: 'Scanning workspace (file listing)…',
      filesContext: this._buildExplorerFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: scanContextLabel
      })
    })

    const failToSibling = async (message) => {
      this._explorerPanel?.clearExplorerBody()
      if (message) this.showToast(message)
      this._clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      setExplorerMode('sibling')
      this._explorerMode = 'sibling'
      this._workspaceTree = null
      this._workspaceDisplayLabel = ''
      await this._runSiblingScan(this._currentFileUrl)
    }

    try {
      const { tree, stats } = await scanFolderRecursive(normalized, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        currentFileUrl: this._currentFileUrl,
        siblingsFirstAtRoot: true,
        onProgress: (p) => {
          this._explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })

      await this._finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        normalizedDirUrl: normalized
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace folder scan failed.', error)
      if (aborted) {
        await failToSibling('')
      } else {
        await failToSibling(restore ? 'Could not restore workspace' : 'Could not scan folder')
      }
    } finally {
      this._scanAbortController = null
    }
  }

  async _exitWorkspace() {
    this._abortWorkspaceScan()
    this._clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    setExplorerMode('sibling')
    this._explorerMode = 'sibling'
    this._workspaceTree = null
    this._workspaceDisplayLabel = ''
    const wasWorkspaceVirtualDoc = isWorkspaceVirtualHref(this._currentFileUrl)
    if (wasWorkspaceVirtualDoc) {
      this._currentFileUrl = window.location.href
    }

    const original = getOriginalFileUrl()
    // Virtual workspace docs use mdp-ws-* URLs but the viewer URL still matches session
    // `original`, so `isOnOriginalFile` is true after the assignment above — we must still
    // reload markdown from `original`. Real file:// picks in workspace use `!isOnOriginalFile`.
    const restoreOriginalDoc =
      Boolean(original) && (wasWorkspaceVirtualDoc || !isOnOriginalFile(this._currentFileUrl))

    this._explorerPanel?.showLoading({ filesContext: this._buildExplorerFilesContext() })
    if (restoreOriginalDoc) {
      await this._navigateToSiblingFile(original, {
        replaceHistory: true,
        forceReload: wasWorkspaceVirtualDoc
      })
      return
    }
    await this._runSiblingScan(this._currentFileUrl)
  }

  _initSidebarResize() {
    const { resizeHandle, root, sidebar } = this.parts || {}
    if (!resizeHandle || !root || !sidebar) return

    this._sidebarResizePointerDown = (event) => {
      if (event.button !== 0) return
      event.preventDefault()

      const startX = event.clientX
      const startWidth = sidebar.getBoundingClientRect().width
      root.classList.add('is-resizing-sidebar')

      this._sidebarResizePointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX
        this._setSidebarWidth(startWidth + deltaX, { persist: false })
      }

      this._sidebarResizePointerUp = () => {
        const width = sidebar.getBoundingClientRect().width
        this._setSidebarWidth(width, { persist: true })
        root.classList.remove('is-resizing-sidebar')
        if (this._sidebarResizePointerMove) {
          window.removeEventListener('pointermove', this._sidebarResizePointerMove)
        }
        if (this._sidebarResizePointerUp) {
          window.removeEventListener('pointerup', this._sidebarResizePointerUp)
        }
        this._sidebarResizePointerMove = null
        this._sidebarResizePointerUp = null
      }

      window.addEventListener('pointermove', this._sidebarResizePointerMove)
      window.addEventListener('pointerup', this._sidebarResizePointerUp)
    }

    this._sidebarResizeKeyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      const currentWidth = sidebar.getBoundingClientRect().width
      const delta = event.key === 'ArrowRight' ? 16 : -16
      this._setSidebarWidth(currentWidth + delta, { persist: true })
    }

    resizeHandle.addEventListener('pointerdown', this._sidebarResizePointerDown)
    resizeHandle.addEventListener('keydown', this._sidebarResizeKeyDown)
    this._resizeHandleTooltipDestroy?.()
    this._resizeHandleTooltipDestroy = attachTooltip(resizeHandle, {
      text: 'Drag to resize the sidebar. When focused, use Left/Right Arrow keys (16px per step).'
    }).destroy
    this._applySidebarWidth()
  }

  _destroySidebarResize() {
    this._resizeHandleTooltipDestroy?.()
    this._resizeHandleTooltipDestroy = null
    const { resizeHandle, root } = this.parts || {}
    root?.classList.remove('is-resizing-sidebar')
    if (this._sidebarResizePointerMove) {
      window.removeEventListener('pointermove', this._sidebarResizePointerMove)
    }
    if (this._sidebarResizePointerUp) {
      window.removeEventListener('pointerup', this._sidebarResizePointerUp)
    }
    if (resizeHandle && this._sidebarResizePointerDown) {
      resizeHandle.removeEventListener('pointerdown', this._sidebarResizePointerDown)
    }
    if (resizeHandle && this._sidebarResizeKeyDown) {
      resizeHandle.removeEventListener('keydown', this._sidebarResizeKeyDown)
    }
    this._sidebarResizePointerDown = null
    this._sidebarResizePointerMove = null
    this._sidebarResizePointerUp = null
    this._sidebarResizeKeyDown = null
  }

  /**
   * @param {string} fileUrl
   * @returns {string}
   */
  static _markdownFileTitleFromUrl(fileUrl) {
    if (typeof fileUrl === 'string' && fileUrl.startsWith(MDP_WS_FILE)) {
      try {
        const rel = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
        const base = rel.split('/').pop() || ''
        const name = base.replace(/\.(md|markdown|mdown)$/i, '')
        return name || 'document'
      } catch {
        return 'document'
      }
    }
    try {
      const p = new URL(fileUrl).pathname
      const base = p.split('/').filter(Boolean).pop() || ''
      const name = base.replace(/\.(md|markdown|mdown)$/i, '')
      return decodeURIComponent(name) || 'original file'
    } catch {
      return 'original file'
    }
  }

  /**
   * “Back to session original” controls for sibling mode.
   * @param {string} openUrl - URL compared to session original (e.g. current file).
   * @returns {{ showBack: boolean, backLabel?: string, onBack?: () => void }}
   */
  _siblingBackNavigationForUrl(openUrl) {
    const original = getOriginalFileUrl()
    const showBack = Boolean(original && !isOnOriginalFile(openUrl))
    if (!showBack) {
      return { showBack: false }
    }
    return {
      showBack: true,
      backLabel: `Back to ${MarkdownViewerApp._markdownFileTitleFromUrl(original)}`,
      onBack: () => {
        if (!original) return
        void this._navigateToSiblingFile(original, { replaceHistory: true })
      }
    }
  }

  _updateUrlWithoutReload(fileUrl, { replace = false } = {}) {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
    try {
      if (replace) {
        window.history.replaceState(null, '', fileUrl)
      } else {
        window.history.pushState(null, '', fileUrl)
      }
    } catch {
      // file:// environments can reject history URL changes.
    }
  }

  /** Keeps “Back to …” in sync when the file tree is not rebuilt (same sibling root / workspace tree). */
  _syncExplorerBackButton() {
    if (!this._explorerPanel) return
    if (this._explorerMode === 'workspace') {
      this._explorerPanel.setExplorerBackNavigation({ showBack: false })
      return
    }
    const { showBack, backLabel, onBack } = this._siblingBackNavigationForUrl(this._currentFileUrl)
    this._explorerPanel.setExplorerBackNavigation({ showBack, backLabel, onBack })
  }

  /**
   * @param {string} fileUrl
   */
  async _navigateWorkspaceVirtualFile(fileUrl) {
    if (!fileUrl || !this._explorerPanel) return

    const current = normalizeFileUrlForCompare(this._currentFileUrl)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (current === target) return

    const entry = this._workspaceVirtualReaders?.get(fileUrl)
    if (!entry) {
      this.showToast('Could not open file')
      return
    }

    this.parts?.article?.setAttribute('aria-busy', 'true')

    try {
      let nextMarkdown = ''
      if (entry instanceof File) {
        nextMarkdown = await entry.text()
      } else {
        const f = await entry.getFile()
        nextMarkdown = await f.text()
      }
      if (!nextMarkdown.trim()) {
        throw new Error('File is empty or not readable.')
      }

      this.markdown = nextMarkdown
      this._smoothInitialHashScroll = false
      this._currentFileUrl = fileUrl
      await this.render({ preserveScroll: false, honorHash: false })
      this.getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
      document.title = `${MarkdownViewerApp._markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to workspace virtual file.', error)
      this.showToast('Could not open file')
    } finally {
      this.parts?.article?.removeAttribute('aria-busy')
    }

    if (this._explorerMode === 'workspace') {
      if (this._workspaceTree) {
        this._explorerPanel?.markActiveFile(this._currentFileUrl)
      }
      this._explorerPanel?.setFilesContext(this._buildExplorerFilesContext())
      this._syncExplorerBackButton()
      return
    }
    await this._runSiblingScan(this._currentFileUrl)
  }

  async _navigateToSiblingFile(fileUrl, { replaceHistory = false, forceReload = false } = {}) {
    if (!fileUrl || !this._explorerPanel) return

    if (isWorkspaceVirtualHref(fileUrl)) {
      await this._navigateWorkspaceVirtualFile(fileUrl)
      return
    }

    const current = normalizeFileUrlForCompare(this._currentFileUrl)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (!forceReload && current === target) return

    this.parts?.article?.setAttribute('aria-busy', 'true')

    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
        payload: { url: fileUrl }
      })
      if (!response?.ok) {
        throw new Error(response?.error || 'Could not load file.')
      }

      const nextMarkdown = String(response.data?.text || '')
      if (!nextMarkdown.trim()) {
        throw new Error('File is empty or not readable.')
      }

      this.markdown = nextMarkdown
      this._smoothInitialHashScroll = false
      this._currentFileUrl = fileUrl
      await this.render({ preserveScroll: false, honorHash: false })
      this.getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
      this._updateUrlWithoutReload(fileUrl, { replace: replaceHistory })
      document.title = `${MarkdownViewerApp._markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to sibling markdown file.', error)
      this.showToast('Could not open file')
    } finally {
      this.parts?.article?.removeAttribute('aria-busy')
    }

    if (this._explorerMode === 'workspace') {
      if (this._workspaceTree) {
        this._explorerPanel?.markActiveFile(this._currentFileUrl)
      }
      this._explorerPanel?.setFilesContext(this._buildExplorerFilesContext())
      this._syncExplorerBackButton()
      return
    }
    if (
      this._siblingTree &&
      this._siblingScanRootUrl &&
      this._currentFileUrl &&
      fileUrlIsUnderDirectoryUrl(this._currentFileUrl, this._siblingScanRootUrl)
    ) {
      this._explorerPanel?.markActiveFile(this._currentFileUrl)
      this._explorerPanel?.setFilesContext(this._buildExplorerFilesContext())
      this._syncExplorerBackButton()
      return
    }
    await this._runSiblingScan(this._currentFileUrl)
  }

  async _runSiblingScan(currentFileUrl) {
    if (!this._explorerPanel) return

    const original = getOriginalFileUrl()
    const { showBack, backLabel, onBack } = this._siblingBackNavigationForUrl(currentFileUrl)

    const ctxBase = {
      showBack,
      backLabel,
      onBack,
      currentFileUrl,
      filesContext: this._buildExplorerFilesContext()
    }

    const parentDir = getParentDirectoryUrl(currentFileUrl)
    if (!parentDir) {
      let files = []
      try {
        files = await scanSiblingFiles(currentFileUrl)
      } catch (error) {
        logger.warn('Sibling scan failed.', error)
      }
      this._siblingTree = null
      this._siblingFolderLabel = ''
      this._siblingScanRootUrl = null
      if (!files.length) {
        this._explorerPanel.showEmpty(ctxBase)
        return
      }
      this._explorerPanel.showFiles(files, {
        ...ctxBase,
        currentFileUrl,
        originalFileUrl: original
      })
      return
    }

    const ex = this.settings?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth)) ? Number(ex.maxScanDepth) : 3
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : 2000
    const maxFolders = Number.isFinite(Number(ex.maxFolders)) ? Number(ex.maxFolders) : 500

    const folderLabel = getParentDirectoryPathLabel(currentFileUrl)
    this._siblingTree = null
    this._siblingFolderLabel = folderLabel
    this._siblingScanRootUrl = null

    try {
      this._explorerPanel.showProgressLoading({
        scannedFiles: 0,
        scannedFolders: 0,
        currentFolder: parentDir,
        progressHeadline: 'Scanning folder tree…',
        filesContext: this._buildExplorerFilesContext({
          scanPhase: 'scanning',
          siblingFolderLabel: folderLabel
        })
      })

      const { tree, stats } = await scanFolderRecursive(parentDir, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        currentFileUrl,
        siblingsFirstAtRoot: true,
        onProgress: (p) => {
          this._explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })

      injectCurrentMarkdownAtRootIfMissing(
        tree,
        currentFileUrl,
        stats,
        normalizeDirectoryUrl(parentDir)
      )
      this._finalizeSiblingTreePresent(tree, stats, {
        maxScanDepth,
        folderLabel
      })
    } catch (error) {
      logger.warn('Deep sibling scan failed.', error)
      this._siblingTree = null
      this._siblingFolderLabel = ''
      this._siblingScanRootUrl = null

      let files = []
      try {
        files = await scanSiblingFiles(currentFileUrl)
      } catch (e2) {
        logger.warn('Flat sibling fallback failed.', e2)
      }

      if (!files.length) {
        this._explorerPanel.showEmpty(ctxBase)
        return
      }

      this._explorerPanel.showFiles(files, {
        ...ctxBase,
        currentFileUrl,
        originalFileUrl: original
      })
    }
  }

  _destroyExplorer() {
    this._abortWorkspaceScan()
    this._clearWorkspaceVirtualReaders()
    this._siblingTree = null
    this._siblingFolderLabel = ''
    this._siblingScanRootUrl = null
    const { tabFiles, tabOutline } = this.parts || {}
    if (this._tabFilesClick && tabFiles) {
      tabFiles.removeEventListener('click', this._tabFilesClick)
    }
    if (this._tabOutlineClick && tabOutline) {
      tabOutline.removeEventListener('click', this._tabOutlineClick)
    }
    this._tabFilesClick = null
    this._tabOutlineClick = null
    if (this._explorerPanel) {
      this._explorerPanel.destroy()
      this._explorerPanel = null
    }
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
    dismissViewerToast(this.parts?.root)
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
    if (this.tocController) this.tocController.destroy()
    this.tocController = null
    this._destroySidebarResize()
    this._destroyExplorer()
    this.container.innerHTML = ''
    this.parts = null
  }
}
