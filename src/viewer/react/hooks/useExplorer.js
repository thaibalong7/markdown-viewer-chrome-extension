import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { logger } from '../../../shared/logger.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH
} from '../../../shared/constants/explorer.js'
import { MESSAGE_TYPES, sendMessage } from '../../../messaging/index.js'
import { scanFolderRecursive } from '../../explorer/folder-scanner.js'
import { scanSiblingFiles } from '../../explorer/sibling-scanner.js'
import {
  pickFilesWithWebkitDirectory,
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList,
  tryFileDirectoryUrlFromWebkitFiles
} from '../../explorer/workspace-picker.js'
import {
  buildExplorerFilesContext,
  explorerTreeContainsFileHref,
  injectCurrentMarkdownAtRootIfMissing
} from '../../explorer/explorer-files-context.js'
import {
  clearWorkspaceRootUrl,
  getExplorerMode,
  getOriginalFileUrl,
  getWorkspaceRootUrl,
  isOnOriginalFile,
  setExplorerMode,
  setOriginalFileUrlIfUnset,
  setWorkspaceRootUrl
} from '../../explorer/explorer-state.js'
import {
  fileUrlIsUnderDirectoryUrl,
  getParentDirectoryPathLabel,
  getParentDirectoryUrl,
  isWorkspaceVirtualHref,
  markdownFileTitleFromUrl,
  normalizeDirectoryUrl,
  normalizeFileUrlForCompare
} from '../../explorer/url-utils.js'
import {
  buildDepthNotice,
  buildInitialExpandedMap,
  countMarkdownFilesInTree,
  getDirectoryLabelFromUrl,
  shortenPath
} from '../../explorer/explorer-tree-utils.js'

function createInitialState() {
  const initialUrl = typeof window !== 'undefined' ? window.location.href : ''
  return {
    explorerMode: 'sibling',
    currentFileUrl: initialUrl,
    activeFileUrl: initialUrl,
    view: 'loading',
    actionsMode: 'hidden',
    files: [],
    tree: null,
    listAriaLabel: 'Workspace files',
    summaryDirectoryLabel: 'Current folder',
    summaryFileCount: 0,
    depthNotice: '',
    progressHeadline: 'Scanning workspace…',
    progressText: '',
    showProgressCancel: false,
    showBack: false,
    backLabel: 'Back to original file',
    expandedMap: new Map(),
    filesContext: null
  }
}

function explorerReducer(state, action) {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload }
    case 'TOGGLE_FOLDER': {
      const nextMap = new Map(state.expandedMap)
      const href = action.href || ''
      nextMap.set(href, !(nextMap.get(href) === true))
      return { ...state, expandedMap: nextMap }
    }
    default:
      return state
  }
}

/**
 * @param {object} options
 * @param {object} options.bridge
 */
export function useExplorer({ bridge }) {
  const [state, dispatch] = useReducer(explorerReducer, undefined, createInitialState)
  const mountedRef = useRef(false)
  const stateRef = useRef(state)
  const scanAbortControllerRef = useRef(null)
  const workspaceVirtualReadersRef = useRef(null)
  const backActionRef = useRef(null)

  const explorerModeRef = useRef('sibling')
  const currentFileUrlRef = useRef(typeof window !== 'undefined' ? window.location.href : '')
  const workspaceTreeRef = useRef(null)
  const siblingTreeRef = useRef(null)
  const siblingFolderLabelRef = useRef('')
  const siblingScanRootUrlRef = useRef(null)
  const workspaceDisplayLabelRef = useRef('')

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const safePatch = useCallback((payload) => {
    if (!mountedRef.current) return
    dispatch({ type: 'PATCH', payload })
  }, [])

  const getScanLimits = useCallback(() => {
    const ex = bridge?.getSettings?.()?.explorer || {}
    const maxScanDepth = Number.isFinite(Number(ex.maxScanDepth))
      ? Number(ex.maxScanDepth)
      : DEFAULT_EXPLORER_MAX_SCAN_DEPTH
    const maxFiles = Number.isFinite(Number(ex.maxFiles)) ? Number(ex.maxFiles) : DEFAULT_EXPLORER_MAX_FILES
    const maxFolders = Number.isFinite(Number(ex.maxFolders))
      ? Number(ex.maxFolders)
      : DEFAULT_EXPLORER_MAX_FOLDERS
    return { maxScanDepth, maxFiles, maxFolders }
  }, [bridge])

  const buildFilesContext = useCallback(
    (opts = {}) => {
      const scanPhase = opts.scanPhase === 'scanning' ? 'scanning' : 'idle'
      const label =
        opts.workspaceDisplayLabel != null && String(opts.workspaceDisplayLabel).trim() !== ''
          ? String(opts.workspaceDisplayLabel).trim()
          : workspaceDisplayLabelRef.current || getWorkspaceRootUrl() || undefined
      const siblingFolderLabel =
        opts.siblingFolderLabel != null && String(opts.siblingFolderLabel).trim() !== ''
          ? String(opts.siblingFolderLabel).trim()
          : siblingFolderLabelRef.current || undefined

      return buildExplorerFilesContext({
        explorerMode: explorerModeRef.current,
        currentFileUrl: currentFileUrlRef.current,
        workspaceTree: workspaceTreeRef.current,
        siblingTree: siblingTreeRef.current,
        workspaceRootUrl: getWorkspaceRootUrl(),
        workspaceDisplayLabel: label,
        siblingFolderLabel,
        scanPhase
      })
    },
    []
  )

  const setCurrentFileUrl = useCallback(
    (nextUrl) => {
      const url = typeof nextUrl === 'string' ? nextUrl : ''
      currentFileUrlRef.current = url
      safePatch({ currentFileUrl: url, activeFileUrl: url })
      bridge?.updateCurrentFileUrl?.(url)
    },
    [bridge, safePatch]
  )

  const abortWorkspaceScan = useCallback(() => {
    if (!scanAbortControllerRef.current) return
    try {
      scanAbortControllerRef.current.abort()
    } catch {
      /* ignore */
    }
    scanAbortControllerRef.current = null
  }, [])

  const clearWorkspaceVirtualReaders = useCallback(() => {
    workspaceVirtualReadersRef.current = null
  }, [])

  const setBackNavigation = useCallback(
    ({ showBack = false, backLabel = 'Back to original file', onBack = null } = {}) => {
      backActionRef.current = typeof onBack === 'function' ? onBack : null
      safePatch({ showBack, backLabel })
    },
    [safePatch]
  )

  const showLoading = useCallback(
    ({ filesContext, actionsMode = 'hidden' } = {}) => {
      safePatch({
        view: 'loading',
        actionsMode,
        depthNotice: '',
        files: [],
        tree: null,
        listAriaLabel: 'Workspace files',
        summaryFileCount: 0,
        filesContext: filesContext || stateRef.current.filesContext
      })
    },
    [safePatch]
  )

  const clearExplorerBody = useCallback(() => {
    safePatch({
      view: 'loading',
      files: [],
      tree: null,
      depthNotice: '',
      progressHeadline: '',
      progressText: '',
      showProgressCancel: false
    })
  }, [safePatch])

  const showProgressLoading = useCallback(
    (payload) => {
      const cur = payload.currentFolder ? `\n${shortenPath(payload.currentFolder)}` : ''
      safePatch({
        view: 'progress',
        actionsMode: 'hidden',
        depthNotice: '',
        files: [],
        tree: null,
        filesContext: payload.filesContext || stateRef.current.filesContext,
        progressHeadline: payload.progressHeadline || 'Scanning workspace…',
        progressText: `Scanning… ${payload.scannedFiles} files, ${payload.scannedFolders} folders${cur}`,
        showProgressCancel: Boolean(payload.onCancel)
      })
    },
    [safePatch]
  )

  const updateProgressLoading = useCallback(
    (payload) => {
      if (stateRef.current.view !== 'progress') return
      const cur = payload.currentFolder ? `\n${shortenPath(payload.currentFolder)}` : ''
      safePatch({
        progressHeadline:
          payload.progressHeadline != null ? payload.progressHeadline : stateRef.current.progressHeadline,
        progressText: `Scanning… ${payload.scannedFiles} files, ${payload.scannedFolders} folders${cur}`
      })
    },
    [safePatch]
  )

  const showEmpty = useCallback(
    (ctx = {}) => {
      safePatch({
        view: 'empty',
        actionsMode: ctx.actionsMode || 'sibling',
        filesContext: ctx.filesContext || stateRef.current.filesContext,
        summaryDirectoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
        summaryFileCount: 0,
        depthNotice: ''
      })
      setBackNavigation({
        showBack: Boolean(ctx.showBack),
        backLabel: ctx.backLabel,
        onBack: ctx.onBack
      })
    },
    [safePatch, setBackNavigation]
  )

  const showFiles = useCallback(
    (files, ctx) => {
      const list = Array.isArray(files) ? files : []
      safePatch({
        view: list.length ? 'files' : 'empty',
        actionsMode: ctx.actionsMode || 'sibling',
        files: list,
        tree: null,
        listAriaLabel: 'Files in current folder',
        filesContext: ctx.filesContext || stateRef.current.filesContext,
        summaryDirectoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
        summaryFileCount: list.length,
        depthNotice: '',
        activeFileUrl: ctx.currentFileUrl || ''
      })
      setBackNavigation({
        showBack: Boolean(ctx.showBack),
        backLabel: ctx.backLabel,
        onBack: ctx.onBack
      })
    },
    [safePatch, setBackNavigation]
  )

  const showTree = useCallback(
    (tree, ctx = {}) => {
      const count = countMarkdownFilesInTree(tree)
      const children = Array.isArray(tree?.children) ? tree.children : []
      const stats = ctx.stats
      const depthNotice =
        stats && (stats.skippedByDepth > 0 || stats.hitFileLimit || stats.hitFolderLimit)
          ? buildDepthNotice(stats, ctx.maxScanDepth)
          : ''

      safePatch({
        view: children.length ? 'tree' : 'empty',
        actionsMode: ctx.actionsMode ?? 'workspace',
        tree,
        files: [],
        listAriaLabel:
          ctx.listAriaLabel || (ctx.actionsMode === 'sibling' ? 'Markdown files in folder tree' : 'Workspace files'),
        expandedMap: buildInitialExpandedMap(children),
        filesContext: ctx.filesContext || stateRef.current.filesContext,
        summaryDirectoryLabel: ctx.workspaceLabel || tree?.name || 'Workspace',
        summaryFileCount: count,
        depthNotice,
        activeFileUrl: currentFileUrlRef.current
      })
      setBackNavigation({
        showBack: Boolean(ctx.showBack),
        backLabel: ctx.backLabel,
        onBack: ctx.onBack
      })
    },
    [safePatch, setBackNavigation]
  )

  const siblingBackNavigationForUrl = useCallback((openUrl, onNavigate) => {
    const original = getOriginalFileUrl()
    const showBack = Boolean(original && !isOnOriginalFile(openUrl))
    if (!showBack) return { showBack: false }
    return {
      showBack: true,
      backLabel: `Back to ${markdownFileTitleFromUrl(original)}`,
      onBack: () => {
        if (!original) return
        void onNavigate(original, { replaceHistory: true })
      }
    }
  }, [])

  const resetViewerToPickWorkspaceFile = useCallback(async () => {
    bridge?.setMarkdown?.('# Select a file\n\nPick a Markdown file from the sidebar list.')
    setCurrentFileUrl('')
    bridge?.setSmoothInitialHashScroll?.(false)
    await bridge?.render?.({ preserveScroll: false, honorHash: false })
    bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
    document.title = 'Markdown Plus'
  }, [bridge, setCurrentFileUrl])

  const runSiblingScan = useRef(null)
  const navigateToFile = useRef(null)

  const syncExplorerBackButton = useCallback(() => {
    if (explorerModeRef.current === 'workspace') {
      setBackNavigation({ showBack: false })
      return
    }
    const nav = siblingBackNavigationForUrl(currentFileUrlRef.current, navigateToFile.current)
    setBackNavigation(nav)
  }, [setBackNavigation, siblingBackNavigationForUrl])

  const finalizeSiblingTreePresent = useCallback(
    (tree, stats, opts) => {
      siblingTreeRef.current = tree
      try {
        siblingScanRootUrlRef.current = normalizeDirectoryUrl(tree.href)
      } catch {
        siblingScanRootUrlRef.current = null
      }
      if (opts.folderLabel && String(opts.folderLabel).trim()) {
        siblingFolderLabelRef.current = String(opts.folderLabel).trim()
      }

      const nav = siblingBackNavigationForUrl(currentFileUrlRef.current, navigateToFile.current)
      showTree(tree, {
        workspaceLabel: siblingFolderLabelRef.current || tree.name || 'Folder',
        stats,
        maxScanDepth: opts.maxScanDepth,
        showBack: nav.showBack,
        backLabel: nav.backLabel,
        onBack: nav.onBack,
        actionsMode: 'sibling',
        listAriaLabel: 'Markdown files in folder tree',
        filesContext: buildFilesContext()
      })
    },
    [buildFilesContext, showTree, siblingBackNavigationForUrl]
  )

  const finalizeWorkspaceTreePresent = useCallback(
    async (tree, stats, opts) => {
      const rootForInject =
        (opts.normalizedDirUrl && String(opts.normalizedDirUrl)) || getWorkspaceRootUrl() || ''
      injectCurrentMarkdownAtRootIfMissing(
        tree,
        currentFileUrlRef.current,
        stats,
        rootForInject.startsWith('file:') ? rootForInject : undefined
      )

      workspaceTreeRef.current = tree

      const current = currentFileUrlRef.current
      let documentStillValid = false
      if (current) {
        if (isWorkspaceVirtualHref(current)) {
          documentStillValid = explorerTreeContainsFileHref(tree, current)
        } else if (current.startsWith('file:') && rootForInject.startsWith('file:')) {
          documentStillValid = fileUrlIsUnderDirectoryUrl(current, rootForInject)
        }
      }
      if (current && !documentStillValid) {
        await resetViewerToPickWorkspaceFile()
      }

      let workspaceLabel = opts.workspaceLabelOverride || tree.name || 'Workspace'
      if (opts.normalizedDirUrl) {
        try {
          const pathname = new URL(opts.normalizedDirUrl).pathname.replace(/\/+$/, '')
          try {
            workspaceLabel = decodeURIComponent(pathname) || workspaceLabel
          } catch {
            workspaceLabel = pathname || workspaceLabel
          }
        } catch {
          /* keep fallback */
        }
      }
      workspaceDisplayLabelRef.current = workspaceLabel

      showTree(tree, {
        workspaceLabel,
        stats,
        maxScanDepth: opts.maxScanDepth,
        showBack: false,
        actionsMode: 'workspace',
        filesContext: buildFilesContext()
      })
    },
    [buildFilesContext, resetViewerToPickWorkspaceFile, showTree]
  )

  const failWorkspaceToSibling = useCallback(
    async (message) => {
      clearExplorerBody()
      if (message) bridge?.showToast?.(message)
      clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      setExplorerMode('sibling')
      explorerModeRef.current = 'sibling'
      workspaceTreeRef.current = null
      workspaceDisplayLabelRef.current = ''
      safePatch({ explorerMode: 'sibling' })
      await runSiblingScan.current?.(currentFileUrlRef.current)
    },
    [bridge, clearExplorerBody, clearWorkspaceVirtualReaders, safePatch]
  )

  const updateUrlWithoutReload = useCallback((fileUrl, { replace = false } = {}) => {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
    try {
      if (replace) window.history.replaceState(null, '', fileUrl)
      else window.history.pushState(null, '', fileUrl)
    } catch {
      /* file protocol may reject history updates */
    }
  }, [])

  const navigateWorkspaceVirtualFile = useCallback(
    async (fileUrl) => {
      if (!fileUrl) return
      const current = normalizeFileUrlForCompare(currentFileUrlRef.current)
      const target = normalizeFileUrlForCompare(fileUrl)
      if (current === target) return

      const entry = workspaceVirtualReadersRef.current?.get(fileUrl)
      if (!entry) {
        bridge?.showToast?.('Could not open file')
        return
      }

      bridge?.getArticleEl?.()?.setAttribute('aria-busy', 'true')
      try {
        let nextMarkdown = ''
        if (entry instanceof File) {
          nextMarkdown = await entry.text()
        } else {
          const file = await entry.getFile()
          nextMarkdown = await file.text()
        }
        if (!nextMarkdown.trim()) throw new Error('File is empty or not readable.')

        bridge?.setMarkdown?.(nextMarkdown)
        bridge?.setSmoothInitialHashScroll?.(false)
        setCurrentFileUrl(fileUrl)
        await bridge?.render?.({ preserveScroll: false, honorHash: false })
        bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
        document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
      } catch (error) {
        logger.warn('Failed to navigate to workspace virtual file.', error)
        bridge?.showToast?.('Could not open file')
      } finally {
        bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
      }

      if (explorerModeRef.current === 'workspace') {
        safePatch({ activeFileUrl: currentFileUrlRef.current, filesContext: buildFilesContext() })
        syncExplorerBackButton()
        return
      }
      await runSiblingScan.current?.(currentFileUrlRef.current)
    },
    [bridge, buildFilesContext, safePatch, setCurrentFileUrl, syncExplorerBackButton]
  )

  navigateToFile.current = async (fileUrl, { replaceHistory = false, forceReload = false } = {}) => {
    if (!fileUrl) return
    if (isWorkspaceVirtualHref(fileUrl)) {
      await navigateWorkspaceVirtualFile(fileUrl)
      return
    }

    const current = normalizeFileUrlForCompare(currentFileUrlRef.current)
    const target = normalizeFileUrlForCompare(fileUrl)
    if (!forceReload && current === target) return

    bridge?.getArticleEl?.()?.setAttribute('aria-busy', 'true')
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.FETCH_FILE_AS_TEXT,
        payload: { url: fileUrl }
      })
      if (!response?.ok) throw new Error(response?.error || 'Could not load file.')
      const nextMarkdown = String(response.data?.text || '')
      if (!nextMarkdown.trim()) throw new Error('File is empty or not readable.')

      bridge?.setMarkdown?.(nextMarkdown)
      bridge?.setSmoothInitialHashScroll?.(false)
      setCurrentFileUrl(fileUrl)
      await bridge?.render?.({ preserveScroll: false, honorHash: false })
      bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
      updateUrlWithoutReload(fileUrl, { replace: replaceHistory })
      document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to sibling markdown file.', error)
      bridge?.showToast?.('Could not open file')
    } finally {
      bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
    }

    if (explorerModeRef.current === 'workspace') {
      safePatch({ activeFileUrl: currentFileUrlRef.current, filesContext: buildFilesContext() })
      syncExplorerBackButton()
      return
    }
    if (
      siblingTreeRef.current &&
      siblingScanRootUrlRef.current &&
      currentFileUrlRef.current &&
      fileUrlIsUnderDirectoryUrl(currentFileUrlRef.current, siblingScanRootUrlRef.current)
    ) {
      safePatch({ activeFileUrl: currentFileUrlRef.current, filesContext: buildFilesContext() })
      syncExplorerBackButton()
      return
    }
    await runSiblingScan.current?.(currentFileUrlRef.current)
  }

  const openWorkspaceFolder = useRef(null)

  const openWorkspaceFromDirectoryHandle = useCallback(
    async (dirHandle) => {
      if (!dirHandle) return
      siblingTreeRef.current = null
      siblingFolderLabelRef.current = ''
      siblingScanRootUrlRef.current = null
      clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      abortWorkspaceScan()
      scanAbortControllerRef.current = new AbortController()
      const signal = scanAbortControllerRef.current.signal

      const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()
      setExplorerMode('workspace')
      explorerModeRef.current = 'workspace'
      safePatch({ explorerMode: 'workspace' })

      showProgressLoading({
        scannedFiles: 0,
        scannedFolders: 0,
        currentFolder: dirHandle.name || '…',
        onCancel: () => scanAbortControllerRef.current?.abort(),
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
          currentFileUrl: currentFileUrlRef.current,
          onProgress: (progress) => {
            updateProgressLoading({
              scannedFiles: progress.scannedFiles,
              scannedFolders: progress.scannedFolders,
              currentFolder: progress.currentFolder
            })
          }
        })
        workspaceVirtualReadersRef.current = readers
        await finalizeWorkspaceTreePresent(tree, stats, {
          maxScanDepth,
          workspaceLabelOverride: dirHandle.name || 'Workspace'
        })
      } catch (error) {
        const aborted = error?.name === 'AbortError' || signal.aborted
        logger.warn('Workspace directory-handle scan failed.', error)
        if (aborted) await failWorkspaceToSibling('')
        else await failWorkspaceToSibling('Could not scan folder')
      } finally {
        scanAbortControllerRef.current = null
      }
    },
    [
      abortWorkspaceScan,
      buildFilesContext,
      clearWorkspaceVirtualReaders,
      failWorkspaceToSibling,
      finalizeWorkspaceTreePresent,
      getScanLimits,
      safePatch,
      showProgressLoading,
      updateProgressLoading
    ]
  )

  const openWorkspaceFromVirtualWebkitFiles = useCallback(
    async (files) => {
      if (!files?.length) return

      siblingTreeRef.current = null
      siblingFolderLabelRef.current = ''
      siblingScanRootUrlRef.current = null
      clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      abortWorkspaceScan()
      scanAbortControllerRef.current = new AbortController()
      const signal = scanAbortControllerRef.current.signal

      const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()
      setExplorerMode('workspace')
      explorerModeRef.current = 'workspace'
      safePatch({ explorerMode: 'workspace' })

      showProgressLoading({
        scannedFiles: 0,
        scannedFolders: 0,
        currentFolder: '…',
        onCancel: () => scanAbortControllerRef.current?.abort(),
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
          onProgress: (progress) => {
            updateProgressLoading({
              scannedFiles: progress.scannedFiles,
              scannedFolders: progress.scannedFolders,
              currentFolder: progress.currentFolder
            })
          }
        })
        workspaceVirtualReadersRef.current = readers
        await finalizeWorkspaceTreePresent(tree, stats, {
          maxScanDepth,
          workspaceLabelOverride: tree.name || 'Workspace'
        })
      } catch (error) {
        const aborted = error?.name === 'AbortError' || signal.aborted
        logger.warn('Workspace webkitdirectory scan failed.', error)
        if (aborted) await failWorkspaceToSibling('')
        else await failWorkspaceToSibling('Could not scan folder')
      } finally {
        scanAbortControllerRef.current = null
      }
    },
    [
      abortWorkspaceScan,
      buildFilesContext,
      clearWorkspaceVirtualReaders,
      failWorkspaceToSibling,
      finalizeWorkspaceTreePresent,
      getScanLimits,
      safePatch,
      showProgressLoading,
      updateProgressLoading
    ]
  )

  const pickAndOpenAnotherWorkspaceFolder = useCallback(async () => {
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
        await openWorkspaceFolder.current?.(dirUrl)
      } else {
        await openWorkspaceFromVirtualWebkitFiles(files)
      }
    } catch (error) {
      logger.warn('Open workspace folder failed.', error)
      bridge?.showToast?.(error?.message || 'Could not open folder')
    }
  }, [bridge, openWorkspaceFromDirectoryHandle, openWorkspaceFromVirtualWebkitFiles])

  openWorkspaceFolder.current = async (dirUrl, opts = {}) => {
    const { restore = false } = opts
    if (!dirUrl) return
    const normalized = normalizeDirectoryUrl(dirUrl)
    siblingTreeRef.current = null
    siblingFolderLabelRef.current = ''
    siblingScanRootUrlRef.current = null
    clearWorkspaceVirtualReaders()
    abortWorkspaceScan()
    scanAbortControllerRef.current = new AbortController()
    const signal = scanAbortControllerRef.current.signal

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    setExplorerMode('workspace')
    setWorkspaceRootUrl(normalized)
    explorerModeRef.current = 'workspace'
    safePatch({ explorerMode: 'workspace' })

    let scanContextLabel = normalized
    try {
      const pathname = new URL(normalized).pathname.replace(/\/+$/, '')
      scanContextLabel = decodeURIComponent(pathname) || scanContextLabel
    } catch {
      /* keep */
    }

    showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: normalized,
      onCancel: () => scanAbortControllerRef.current?.abort(),
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
        currentFileUrl: currentFileUrlRef.current,
        siblingsFirstAtRoot: true,
        onProgress: (progress) => {
          updateProgressLoading({
            scannedFiles: progress.scannedFiles,
            scannedFolders: progress.scannedFolders,
            currentFolder: progress.currentFolder
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
      if (aborted) await failWorkspaceToSibling('')
      else await failWorkspaceToSibling(restore ? 'Could not restore workspace' : 'Could not scan folder')
    } finally {
      scanAbortControllerRef.current = null
    }
  }

  const exitWorkspace = useCallback(async () => {
    abortWorkspaceScan()
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    setExplorerMode('sibling')
    explorerModeRef.current = 'sibling'
    workspaceTreeRef.current = null
    workspaceDisplayLabelRef.current = ''
    safePatch({ explorerMode: 'sibling' })

    const wasWorkspaceVirtualDoc = isWorkspaceVirtualHref(currentFileUrlRef.current)
    if (wasWorkspaceVirtualDoc) {
      setCurrentFileUrl(window.location.href)
    }

    const original = getOriginalFileUrl()
    const restoreOriginalDoc =
      Boolean(original) && (wasWorkspaceVirtualDoc || !isOnOriginalFile(currentFileUrlRef.current))

    showLoading({ filesContext: buildFilesContext() })
    if (restoreOriginalDoc) {
      await navigateToFile.current?.(original, {
        replaceHistory: true,
        forceReload: wasWorkspaceVirtualDoc
      })
      return
    }
    await runSiblingScan.current?.(currentFileUrlRef.current)
  }, [
    abortWorkspaceScan,
    buildFilesContext,
    clearWorkspaceVirtualReaders,
    safePatch,
    setCurrentFileUrl,
    showLoading
  ])

  runSiblingScan.current = async (urlForScan) => {
    const nav = siblingBackNavigationForUrl(urlForScan, navigateToFile.current)
    const ctxBase = {
      showBack: nav.showBack,
      backLabel: nav.backLabel,
      onBack: nav.onBack,
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
      siblingTreeRef.current = null
      siblingFolderLabelRef.current = ''
      siblingScanRootUrlRef.current = null
      if (!files.length) {
        showEmpty(ctxBase)
        return
      }
      showFiles(files, ctxBase)
      return
    }

    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()
    const folderLabel = getParentDirectoryPathLabel(urlForScan)
    siblingTreeRef.current = null
    siblingFolderLabelRef.current = folderLabel
    siblingScanRootUrlRef.current = null

    try {
      showProgressLoading({
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
        onProgress: (progress) => {
          updateProgressLoading({
            scannedFiles: progress.scannedFiles,
            scannedFolders: progress.scannedFolders,
            currentFolder: progress.currentFolder
          })
        }
      })

      injectCurrentMarkdownAtRootIfMissing(tree, urlForScan, stats, normalizeDirectoryUrl(parentDir))
      finalizeSiblingTreePresent(tree, stats, { maxScanDepth, folderLabel })
    } catch (error) {
      logger.warn('Deep sibling scan failed.', error)
      siblingTreeRef.current = null
      siblingFolderLabelRef.current = ''
      siblingScanRootUrlRef.current = null

      let files = []
      try {
        files = await scanSiblingFiles(urlForScan)
      } catch (flatError) {
        logger.warn('Flat sibling fallback failed.', flatError)
      }

      if (!files.length) {
        showEmpty(ctxBase)
        return
      }
      showFiles(files, ctxBase)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const initialUrl = typeof window !== 'undefined' ? window.location.href : ''
    setCurrentFileUrl(initialUrl)
    setOriginalFileUrlIfUnset(initialUrl)

    if (getExplorerMode() === 'workspace' && !getWorkspaceRootUrl()) {
      setExplorerMode('sibling')
    }

    const storedMode = getExplorerMode()
    const storedRoot = getWorkspaceRootUrl()
    if (storedMode === 'workspace' && storedRoot) {
      explorerModeRef.current = 'workspace'
      safePatch({ explorerMode: 'workspace', filesContext: buildFilesContext() })
      showLoading({ filesContext: buildFilesContext() })
      void openWorkspaceFolder.current?.(storedRoot, { restore: true })
    } else {
      explorerModeRef.current = 'sibling'
      safePatch({ explorerMode: 'sibling', filesContext: buildFilesContext() })
      showLoading({ filesContext: buildFilesContext() })
      void runSiblingScan.current?.(initialUrl)
    }

    return () => {
      mountedRef.current = false
      abortWorkspaceScan()
      clearWorkspaceVirtualReaders()
    }
  }, [
    abortWorkspaceScan,
    buildFilesContext,
    clearWorkspaceVirtualReaders,
    safePatch,
    setCurrentFileUrl,
    showLoading
  ])

  const actions = useMemo(
    () => ({
      onNavigate: (href) => {
        safePatch({ activeFileUrl: href || '' })
        void navigateToFile.current?.(href)
      },
      onOpenAnotherFolder: () => {
        void pickAndOpenAnotherWorkspaceFolder()
      },
      onExitWorkspace: () => {
        void exitWorkspace()
      },
      onBack: () => {
        backActionRef.current?.()
      },
      onCancelProgress: () => {
        scanAbortControllerRef.current?.abort()
      },
      onToggleFolder: (href) => {
        dispatch({ type: 'TOGGLE_FOLDER', href })
      }
    }),
    [exitWorkspace, pickAndOpenAnotherWorkspaceFolder, safePatch]
  )

  return {
    state,
    actions
  }
}
