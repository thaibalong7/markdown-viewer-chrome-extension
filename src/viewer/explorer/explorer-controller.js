import { logger } from '../../shared/logger.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
  MDP_WS_FILE
} from '../../shared/constants/explorer.js'
import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'
import { scanFolderRecursive } from './folder-scanner.js'
import { scanSiblingFiles } from './sibling-scanner.js'
import {
  fileUrlIsUnderDirectoryUrl,
  getParentDirectoryPathLabel,
  getParentDirectoryUrl,
  isWorkspaceVirtualHref,
  normalizeDirectoryUrl,
  normalizeFileUrlForCompare
} from './url-utils.js'
import {
  pickFilesWithWebkitDirectory,
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList,
  tryFileDirectoryUrlFromWebkitFiles
} from './workspace-picker.js'
import {
  buildExplorerFilesContext,
  explorerTreeContainsFileHref,
  injectCurrentMarkdownAtRootIfMissing
} from './explorer-files-context.js'
import { createExplorerPanel } from './explorer-panel.js'
import {
  clearWorkspaceRootUrl,
  getActiveSidebarTab,
  getExplorerMode,
  getOriginalFileUrl,
  getWorkspaceRootUrl,
  isOnOriginalFile,
  setActiveSidebarTab,
  setExplorerMode,
  setOriginalFileUrlIfUnset,
  setWorkspaceRootUrl
} from './explorer-state.js'

/**
 * @param {string} fileUrl
 * @returns {string}
 */
export function markdownFileTitleFromUrl(fileUrl) {
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
 * Files / workspace sidebar orchestration (separate from core markdown render).
 * @param {object} deps
 * @param {() => import('../shell/viewer-shell.js').ShellParts | null | undefined} deps.getParts
 * @param {() => object} deps.getSettings
 * @param {(markdown: string) => void} deps.setMarkdown
 * @param {(value: boolean) => void} deps.setSmoothInitialHashScroll
 * @param {(opts?: { preserveScroll?: boolean, honorHash?: boolean }) => Promise<unknown>} deps.render
 * @param {(message: string) => void} deps.showToast
 * @param {() => HTMLElement | null} deps.getScrollRoot
 * @param {() => HTMLElement | null | undefined} deps.getArticleEl
 */
export function createExplorerController(deps) {
  const {
    getParts,
    getSettings,
    setMarkdown,
    setSmoothInitialHashScroll,
    render,
    showToast,
    getScrollRoot,
    getArticleEl
  } = deps

  /** @type {ReturnType<typeof createExplorerPanel> | null} */
  let explorerPanel = null
  let tabFilesClick = null
  let tabOutlineClick = null
  let currentFileUrl = window.location.href
  /** @type {'sibling' | 'workspace'} */
  let explorerMode = 'sibling'
  /** @type {import('./folder-scanner.js').ExplorerTreeNode | null} */
  let workspaceTree = null
  /** @type {import('./folder-scanner.js').ExplorerTreeNode | null} */
  let siblingTree = null
  let siblingFolderLabel = ''
  let siblingScanRootUrl = null
  /** @type {AbortController | null} */
  let scanAbortController = null
  /** @type {Map<string, File | FileSystemFileHandle> | null} */
  let workspaceVirtualReaders = null
  let workspaceDisplayLabel = ''

  function getScanLimits() {
    const ex = getSettings()?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth))
      ? Number(ex.maxScanDepth)
      : DEFAULT_EXPLORER_MAX_SCAN_DEPTH
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : DEFAULT_EXPLORER_MAX_FILES
    const maxFolders = Number.isFinite(Number(ex.maxFolders))
      ? Number(ex.maxFolders)
      : DEFAULT_EXPLORER_MAX_FOLDERS
    return { maxScanDepth, maxFiles, maxFolders }
  }

  /**
   * @param {'files' | 'outline'} tabId
   */
  function setSidebarTab(tabId) {
    const { tabFiles, tabOutline, filesPanel, outlinePanel } = getParts() || {}
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

  function applySidebarTabFromStorage() {
    setSidebarTab(getActiveSidebarTab())
  }

  /**
   * @param {object} [opts]
   * @param {'idle' | 'scanning'} [opts.scanPhase]
   * @param {string} [opts.workspaceDisplayLabel]
   * @param {string} [opts.siblingFolderLabel]
   */
  function buildFilesContext(opts = {}) {
    const scanPhase = opts.scanPhase === 'scanning' ? 'scanning' : 'idle'
    const label =
      opts.workspaceDisplayLabel != null && String(opts.workspaceDisplayLabel).trim() !== ''
        ? String(opts.workspaceDisplayLabel).trim()
        : workspaceDisplayLabel || getWorkspaceRootUrl() || undefined

    const sfl =
      opts.siblingFolderLabel != null && String(opts.siblingFolderLabel).trim() !== ''
        ? String(opts.siblingFolderLabel).trim()
        : siblingFolderLabel || undefined

    return buildExplorerFilesContext({
      explorerMode,
      currentFileUrl,
      workspaceTree,
      siblingTree,
      workspaceRootUrl: getWorkspaceRootUrl(),
      workspaceDisplayLabel: label,
      siblingFolderLabel: sfl,
      scanPhase
    })
  }

  function abortWorkspaceScan() {
    if (scanAbortController) {
      try {
        scanAbortController.abort()
      } catch {
        /* ignore */
      }
      scanAbortController = null
    }
  }

  function clearWorkspaceVirtualReaders() {
    workspaceVirtualReaders = null
  }

  async function failWorkspaceToSibling(message) {
    explorerPanel?.clearExplorerBody()
    if (message) showToast(message)
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    setExplorerMode('sibling')
    explorerMode = 'sibling'
    workspaceTree = null
    workspaceDisplayLabel = ''
    await runSiblingScan(currentFileUrl)
  }

  function updateUrlWithoutReload(fileUrl, { replace = false } = {}) {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
    try {
      if (replace) {
        window.history.replaceState(null, '', fileUrl)
      } else {
        window.history.pushState(null, '', fileUrl)
      }
    } catch {
      /* file:// environments can reject history URL changes. */
    }
  }

  function siblingBackNavigationForUrl(openUrl) {
    const original = getOriginalFileUrl()
    const showBack = Boolean(original && !isOnOriginalFile(openUrl))
    if (!showBack) {
      return { showBack: false }
    }
    return {
      showBack: true,
      backLabel: `Back to ${markdownFileTitleFromUrl(original)}`,
      onBack: () => {
        if (!original) return
        void navigateToSiblingFile(original, { replaceHistory: true })
      }
    }
  }

  function syncExplorerBackButton() {
    if (!explorerPanel) return
    if (explorerMode === 'workspace') {
      explorerPanel.setExplorerBackNavigation({ showBack: false })
      return
    }
    const { showBack, backLabel, onBack } = siblingBackNavigationForUrl(currentFileUrl)
    explorerPanel.setExplorerBackNavigation({ showBack, backLabel, onBack })
  }

  /**
   * @param {import('./folder-scanner.js').ExplorerTreeNode} tree
   * @param {import('./folder-scanner.js').ScanFolderStats} stats
   * @param {{ maxScanDepth: number, folderLabel?: string }} opts
   */
  function finalizeSiblingTreePresent(tree, stats, opts) {
    if (!explorerPanel) return
    const { maxScanDepth, folderLabel } = opts

    siblingTree = tree
    try {
      siblingScanRootUrl = normalizeDirectoryUrl(tree.href)
    } catch {
      siblingScanRootUrl = null
    }
    if (folderLabel && String(folderLabel).trim()) {
      siblingFolderLabel = String(folderLabel).trim()
    }

    const { showBack, backLabel, onBack } = siblingBackNavigationForUrl(currentFileUrl)

    const listLabel = siblingFolderLabel || tree.name || 'Folder'

    explorerPanel.showTree(tree, {
      workspaceLabel: listLabel,
      stats,
      maxScanDepth,
      showBack,
      backLabel,
      onBack,
      actionsMode: 'sibling',
      listAriaLabel: 'Markdown files in folder tree',
      filesContext: buildFilesContext()
    })
    if (!currentFileUrl) {
      explorerPanel.markActiveFile('')
    } else {
      explorerPanel.markActiveFile(currentFileUrl)
    }
  }

  /**
   * @param {import('./folder-scanner.js').ExplorerTreeNode} tree
   * @param {import('./folder-scanner.js').ScanFolderStats} stats
   * @param {{ maxScanDepth: number, normalizedDirUrl?: string, workspaceLabelOverride?: string }} opts
   */
  async function finalizeWorkspaceTreePresent(tree, stats, opts) {
    if (!explorerPanel) return
    const { maxScanDepth, normalizedDirUrl, workspaceLabelOverride } = opts

    const rootForInject =
      (normalizedDirUrl && String(normalizedDirUrl)) || getWorkspaceRootUrl() || ''
    injectCurrentMarkdownAtRootIfMissing(
      tree,
      currentFileUrl,
      stats,
      rootForInject.startsWith('file:') ? rootForInject : undefined
    )

    workspaceTree = tree

    const rootNorm = rootForInject
    const cur = currentFileUrl
    let documentStillValid = false
    if (cur) {
      if (isWorkspaceVirtualHref(cur)) {
        documentStillValid = explorerTreeContainsFileHref(tree, cur)
      } else if (cur.startsWith('file:') && rootNorm.startsWith('file:')) {
        documentStillValid = fileUrlIsUnderDirectoryUrl(cur, rootNorm)
      }
    }
    if (cur && !documentStillValid) {
      await resetViewerToPickWorkspaceFile()
    }

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

    workspaceDisplayLabel = workspaceLabel

    explorerPanel.showTree(tree, {
      workspaceLabel,
      stats,
      maxScanDepth,
      showBack,
      actionsMode: 'workspace',
      filesContext: buildFilesContext()
    })
    if (!currentFileUrl) {
      explorerPanel.markActiveFile('')
    } else {
      explorerPanel.markActiveFile(currentFileUrl)
    }
  }

  async function resetViewerToPickWorkspaceFile() {
    setMarkdown('# Select a file\n\nPick a Markdown file from the sidebar list.')
    currentFileUrl = ''
    setSmoothInitialHashScroll(false)
    await render({ preserveScroll: false, honorHash: false })
    getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
    document.title = 'Markdown Plus'
  }

  async function pickAndOpenAnotherWorkspaceFolder() {
    if (!explorerPanel) return

    if (typeof window.showDirectoryPicker === 'function') {
      let handle
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' })
      } catch (error) {
        if (error?.name === 'AbortError') return
        logger.debug('showDirectoryPicker failed; trying webkitdirectory.', error)
      }
      if (handle) {
        await openWorkspaceFromDirectoryHandle(handle)
        return
      }
    }

    const files = await pickFilesWithWebkitDirectory()
    if (!files?.length) return

    try {
      const dirUrl = tryFileDirectoryUrlFromWebkitFiles(files)
      if (dirUrl) {
        await openWorkspaceFolder(dirUrl)
      } else {
        await openWorkspaceFromVirtualWebkitFiles(files)
      }
    } catch (error) {
      logger.warn('Open workspace folder failed.', error)
      showToast(error?.message || 'Could not open folder')
    }
  }

  /**
   * @param {FileSystemDirectoryHandle} dirHandle
   */
  async function openWorkspaceFromDirectoryHandle(dirHandle) {
    if (!explorerPanel || !dirHandle) return

    siblingTree = null
    siblingFolderLabel = ''
    siblingScanRootUrl = null
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    abortWorkspaceScan()
    scanAbortController = new AbortController()
    const { signal } = scanAbortController

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    setExplorerMode('workspace')
    explorerMode = 'workspace'

    explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: dirHandle.name || '…',
      onCancel: () => scanAbortController?.abort(),
      progressHeadline: 'Scanning picked folder…',
      filesContext: buildFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: dirHandle.name || 'Folder'
      })
    })

    try {
      const { tree, stats, readers } = await scanWorkspaceFromDirectoryHandle(dirHandle, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        currentFileUrl,
        onProgress: (p) => {
          explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })
      workspaceVirtualReaders = readers
      await finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: dirHandle.name || 'Workspace'
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace directory-handle scan failed.', error)
      if (aborted) {
        await failWorkspaceToSibling('')
      } else {
        await failWorkspaceToSibling('Could not scan folder')
      }
    } finally {
      scanAbortController = null
    }
  }

  /**
   * @param {File[]} files
   */
  async function openWorkspaceFromVirtualWebkitFiles(files) {
    if (!explorerPanel || !files?.length) return

    siblingTree = null
    siblingFolderLabel = ''
    siblingScanRootUrl = null
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    abortWorkspaceScan()
    scanAbortController = new AbortController()
    const { signal } = scanAbortController

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    setExplorerMode('workspace')
    explorerMode = 'workspace'

    explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: '…',
      onCancel: () => scanAbortController?.abort(),
      progressHeadline: 'Scanning imported folder…',
      filesContext: buildFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: 'Imported folder'
      })
    })

    try {
      const { tree, stats, readers } = await scanWorkspaceFromWebkitFileList(files, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        onProgress: (p) => {
          explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })
      workspaceVirtualReaders = readers
      await finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: tree.name || 'Workspace'
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace webkitdirectory scan failed.', error)
      if (aborted) {
        await failWorkspaceToSibling('')
      } else {
        await failWorkspaceToSibling('Could not scan folder')
      }
    } finally {
      scanAbortController = null
    }
  }

  /**
   * @param {string} dirUrl
   * @param {{ restore?: boolean }} [opts]
   */
  async function openWorkspaceFolder(dirUrl, opts = {}) {
    const { restore = false } = opts
    if (!explorerPanel || !dirUrl) return

    const normalized = normalizeDirectoryUrl(dirUrl)
    siblingTree = null
    siblingFolderLabel = ''
    siblingScanRootUrl = null
    clearWorkspaceVirtualReaders()
    abortWorkspaceScan()
    scanAbortController = new AbortController()
    const { signal } = scanAbortController

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    setExplorerMode('workspace')
    setWorkspaceRootUrl(normalized)
    explorerMode = 'workspace'

    let scanContextLabel = normalized
    try {
      const p = new URL(normalized).pathname.replace(/\/+$/, '')
      scanContextLabel = decodeURIComponent(p) || scanContextLabel
    } catch {
      /* keep */
    }

    explorerPanel.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: normalized,
      onCancel: () => scanAbortController?.abort(),
      progressHeadline: 'Scanning workspace (file listing)…',
      filesContext: buildFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: scanContextLabel
      })
    })

    try {
      const { tree, stats } = await scanFolderRecursive(normalized, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        currentFileUrl,
        siblingsFirstAtRoot: true,
        onProgress: (p) => {
          explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })

      await finalizeWorkspaceTreePresent(tree, stats, {
        maxScanDepth,
        normalizedDirUrl: normalized
      })
    } catch (error) {
      const aborted = error?.name === 'AbortError' || signal.aborted
      logger.warn('Workspace folder scan failed.', error)
      if (aborted) {
        await failWorkspaceToSibling('')
      } else {
        await failWorkspaceToSibling(restore ? 'Could not restore workspace' : 'Could not scan folder')
      }
    } finally {
      scanAbortController = null
    }
  }

  async function exitWorkspace() {
    abortWorkspaceScan()
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    setExplorerMode('sibling')
    explorerMode = 'sibling'
    workspaceTree = null
    workspaceDisplayLabel = ''
    const wasWorkspaceVirtualDoc = isWorkspaceVirtualHref(currentFileUrl)
    if (wasWorkspaceVirtualDoc) {
      currentFileUrl = window.location.href
    }

    const original = getOriginalFileUrl()
    const restoreOriginalDoc =
      Boolean(original) && (wasWorkspaceVirtualDoc || !isOnOriginalFile(currentFileUrl))

    explorerPanel?.showLoading({ filesContext: buildFilesContext() })
    if (restoreOriginalDoc) {
      await navigateToSiblingFile(original, {
        replaceHistory: true,
        forceReload: wasWorkspaceVirtualDoc
      })
      return
    }
    await runSiblingScan(currentFileUrl)
  }

  /**
   * @param {string} fileUrl
   */
  async function navigateWorkspaceVirtualFile(fileUrl) {
    if (!fileUrl || !explorerPanel) return

    const current = normalizeFileUrlForCompare(currentFileUrl)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (current === target) return

    const entry = workspaceVirtualReaders?.get(fileUrl)
    if (!entry) {
      showToast('Could not open file')
      return
    }

    getArticleEl()?.setAttribute('aria-busy', 'true')

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

      setMarkdown(nextMarkdown)
      setSmoothInitialHashScroll(false)
      currentFileUrl = fileUrl
      await render({ preserveScroll: false, honorHash: false })
      getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
      document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to workspace virtual file.', error)
      showToast('Could not open file')
    } finally {
      getArticleEl()?.removeAttribute('aria-busy')
    }

    if (explorerMode === 'workspace') {
      if (workspaceTree) {
        explorerPanel?.markActiveFile(currentFileUrl)
      }
      explorerPanel?.setFilesContext(buildFilesContext())
      syncExplorerBackButton()
      return
    }
    await runSiblingScan(currentFileUrl)
  }

  async function navigateToSiblingFile(fileUrl, { replaceHistory = false, forceReload = false } = {}) {
    if (!fileUrl || !explorerPanel) return

    if (isWorkspaceVirtualHref(fileUrl)) {
      await navigateWorkspaceVirtualFile(fileUrl)
      return
    }

    const current = normalizeFileUrlForCompare(currentFileUrl)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (!forceReload && current === target) return

    getArticleEl()?.setAttribute('aria-busy', 'true')

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

      setMarkdown(nextMarkdown)
      setSmoothInitialHashScroll(false)
      currentFileUrl = fileUrl
      await render({ preserveScroll: false, honorHash: false })
      getScrollRoot()?.scrollTo({ top: 0, behavior: 'auto' })
      updateUrlWithoutReload(fileUrl, { replace: replaceHistory })
      document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to sibling markdown file.', error)
      showToast('Could not open file')
    } finally {
      getArticleEl()?.removeAttribute('aria-busy')
    }

    if (explorerMode === 'workspace') {
      if (workspaceTree) {
        explorerPanel?.markActiveFile(currentFileUrl)
      }
      explorerPanel?.setFilesContext(buildFilesContext())
      syncExplorerBackButton()
      return
    }
    if (
      siblingTree &&
      siblingScanRootUrl &&
      currentFileUrl &&
      fileUrlIsUnderDirectoryUrl(currentFileUrl, siblingScanRootUrl)
    ) {
      explorerPanel?.markActiveFile(currentFileUrl)
      explorerPanel?.setFilesContext(buildFilesContext())
      syncExplorerBackButton()
      return
    }
    await runSiblingScan(currentFileUrl)
  }

  async function runSiblingScan(urlForScan) {
    if (!explorerPanel) return

    const original = getOriginalFileUrl()
    const { showBack, backLabel, onBack } = siblingBackNavigationForUrl(urlForScan)

    const ctxBase = {
      showBack,
      backLabel,
      onBack,
      currentFileUrl: urlForScan,
      filesContext: buildFilesContext()
    }

    const parentDir = getParentDirectoryUrl(urlForScan)
    if (!parentDir) {
      let files = []
      try {
        files = await scanSiblingFiles(urlForScan)
      } catch (error) {
        logger.warn('Sibling scan failed.', error)
      }
      siblingTree = null
      siblingFolderLabel = ''
      siblingScanRootUrl = null
      if (!files.length) {
        explorerPanel.showEmpty(ctxBase)
        return
      }
      explorerPanel.showFiles(files, {
        ...ctxBase,
        currentFileUrl: urlForScan,
        originalFileUrl: original
      })
      return
    }

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    const folderLabel = getParentDirectoryPathLabel(urlForScan)
    siblingTree = null
    siblingFolderLabel = folderLabel
    siblingScanRootUrl = null

    try {
      explorerPanel.showProgressLoading({
        scannedFiles: 0,
        scannedFolders: 0,
        currentFolder: parentDir,
        progressHeadline: 'Scanning folder tree…',
        filesContext: buildFilesContext({
          scanPhase: 'scanning',
          siblingFolderLabel: folderLabel
        })
      })

      const { tree, stats } = await scanFolderRecursive(parentDir, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        currentFileUrl: urlForScan,
        siblingsFirstAtRoot: true,
        onProgress: (p) => {
          explorerPanel?.updateProgressLoading({
            scannedFiles: p.scannedFiles,
            scannedFolders: p.scannedFolders,
            currentFolder: p.currentFolder
          })
        }
      })

      injectCurrentMarkdownAtRootIfMissing(
        tree,
        urlForScan,
        stats,
        normalizeDirectoryUrl(parentDir)
      )
      finalizeSiblingTreePresent(tree, stats, {
        maxScanDepth,
        folderLabel
      })
    } catch (error) {
      logger.warn('Deep sibling scan failed.', error)
      siblingTree = null
      siblingFolderLabel = ''
      siblingScanRootUrl = null

      let files = []
      try {
        files = await scanSiblingFiles(urlForScan)
      } catch (e2) {
        logger.warn('Flat sibling fallback failed.', e2)
      }

      if (!files.length) {
        explorerPanel.showEmpty(ctxBase)
        return
      }

      explorerPanel.showFiles(files, {
        ...ctxBase,
        currentFileUrl: urlForScan,
        originalFileUrl: original
      })
    }
  }

  function init() {
    const { explorerContainer, tabFiles, tabOutline } = getParts() || {}
    if (!explorerContainer || !tabFiles || !tabOutline) return

    if (getExplorerMode() === 'workspace' && !getWorkspaceRootUrl()) {
      setExplorerMode('sibling')
    }

    setOriginalFileUrlIfUnset(window.location.href)
    applySidebarTabFromStorage()

    explorerPanel = createExplorerPanel({
      container: explorerContainer,
      onNavigate: (href) => {
        void navigateToSiblingFile(href)
      },
      onOpenAnotherFolder: () => {
        void pickAndOpenAnotherWorkspaceFolder()
      },
      onExitWorkspace: () => {
        void exitWorkspace()
      }
    })

    tabFilesClick = () => setSidebarTab('files')
    tabOutlineClick = () => setSidebarTab('outline')
    tabFiles.addEventListener('click', tabFilesClick)
    tabOutline.addEventListener('click', tabOutlineClick)

    const storedMode = getExplorerMode()
    const storedRoot = getWorkspaceRootUrl()
    if (storedMode === 'workspace' && storedRoot) {
      explorerMode = 'workspace'
      explorerPanel.showLoading({ filesContext: buildFilesContext() })
      void openWorkspaceFolder(storedRoot, { restore: true })
      return
    }

    explorerPanel.showLoading({ filesContext: buildFilesContext() })
    void runSiblingScan(currentFileUrl)
  }

  function destroy() {
    abortWorkspaceScan()
    clearWorkspaceVirtualReaders()
    siblingTree = null
    siblingFolderLabel = ''
    siblingScanRootUrl = null
    const { tabFiles, tabOutline } = getParts() || {}
    if (tabFilesClick && tabFiles) {
      tabFiles.removeEventListener('click', tabFilesClick)
    }
    if (tabOutlineClick && tabOutline) {
      tabOutline.removeEventListener('click', tabOutlineClick)
    }
    tabFilesClick = null
    tabOutlineClick = null
    if (explorerPanel) {
      explorerPanel.destroy()
      explorerPanel = null
    }
  }

  function getCurrentFileUrl() {
    return currentFileUrl
  }

  return {
    init,
    destroy,
    getCurrentFileUrl
  }
}
