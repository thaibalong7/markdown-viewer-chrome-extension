import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { createExplorerViewActions } from './explorer/createExplorerViewActions.js'
import { createInitialState, explorerReducer } from './explorer/explorerReducer.js'
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
import { expandAncestorsForFile } from '../../explorer/explorer-tree-utils.js'
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
import { getToolbarHeightInScrollRoot, scrollToElementInViewer } from '../../scroll-utils.js'

const DEFERRED_SCROLL_DELAY_MS = 200

function focusAfterNavigation(bridge, hash) {
  const article = bridge?.getArticleEl?.()
  if (!(article instanceof HTMLElement)) return
  if (hash) {
    const id = String(hash).replace(/^#/, '')
    if (id) {
      try {
        const heading = article.querySelector(`#${CSS.escape(id)}`)
        if (heading instanceof HTMLElement) {
          heading.setAttribute('tabindex', '-1')
          heading.focus({ preventScroll: true })
          return
        }
      } catch { /* fall through to article focus */ }
    }
  }
  article.setAttribute('tabindex', '-1')
  article.focus({ preventScroll: true })
}

function deferredScrollRetry(bridge, hash, scrollToHeadingHash) {
  if (!hash) return
  requestAnimationFrame(() => {
    setTimeout(() => {
      scrollToHeadingHash(hash, { behavior: 'auto' })
    }, DEFERRED_SCROLL_DELAY_MS)
  })
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

  const {
    showLoading,
    clearExplorerBody,
    showProgressLoading,
    updateProgressLoading,
    showEmpty,
    showFiles,
    showTree
  } = useMemo(
    () =>
      createExplorerViewActions({
        stateRef,
        safePatch,
        setBackNavigation,
        currentFileUrlRef
      }),
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

  const normalizeHashTarget = useCallback((hash) => {
    const value = String(hash || '').replace(/^#/, '')
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }, [])

  const scrollToHeadingHash = useCallback(
    (hash, { behavior = 'auto' } = {}) => {
      const id = normalizeHashTarget(hash)
      if (!id) return false

      const article = bridge?.getArticleEl?.()
      if (!(article instanceof HTMLElement)) return false
      const headingEl = article.querySelector(`#${CSS.escape(id)}`)
      if (!headingEl) return false

      const scrollRoot = bridge?.getScrollRoot?.()
      if (!scrollRoot) return false

      const toolbarHeight = getToolbarHeightInScrollRoot(scrollRoot)
      scrollToElementInViewer({ element: headingEl, scrollRoot, toolbarHeight, behavior })
      return true
    },
    [bridge, normalizeHashTarget]
  )

  const bridgeNavigateToFile = useCallback((fileUrl, opts = {}) => navigateToFile.current?.(fileUrl, opts), [])
  const bridgeVirtualFileExists = useCallback(
    (href) => workspaceVirtualReadersRef.current?.has(href) ?? false,
    []
  )

  useEffect(() => {
    if (!bridge) return undefined
    bridge.navigateToFile = bridgeNavigateToFile
    return () => {
      if (bridge.navigateToFile === bridgeNavigateToFile) {
        bridge.navigateToFile = null
      }
    }
  }, [bridge, bridgeNavigateToFile])

  useEffect(() => {
    if (!bridge) return undefined
    bridge.virtualFileExists = bridgeVirtualFileExists
    return () => {
      if (bridge.virtualFileExists === bridgeVirtualFileExists) {
        bridge.virtualFileExists = null
      }
    }
  }, [bridge, bridgeVirtualFileExists])

  const syncExplorerBackButton = useCallback(() => {
    if (explorerModeRef.current === 'workspace') {
      setBackNavigation({ showBack: false })
      return
    }
    const nav = siblingBackNavigationForUrl(currentFileUrlRef.current, navigateToFile.current)
    setBackNavigation(nav)
  }, [setBackNavigation, siblingBackNavigationForUrl])

  const revealFileInTree = useCallback(
    (fileUrl) => {
      const tree =
        explorerModeRef.current === 'workspace' ? workspaceTreeRef.current : siblingTreeRef.current
      if (!tree?.children?.length) return
      const nextMap = expandAncestorsForFile(
        tree.children,
        fileUrl,
        stateRef.current.expandedMap,
        normalizeFileUrlForCompare
      )
      if (nextMap !== stateRef.current.expandedMap) {
        safePatch({ expandedMap: nextMap })
      }
    },
    [safePatch]
  )

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

  const updateUrlWithoutReload = useCallback((fileUrl, { replace = false, hash = null } = {}) => {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file:')) return
    try {
      const nextUrl = new URL(fileUrl)
      nextUrl.hash = hash ? encodeURIComponent(normalizeHashTarget(hash)) : ''
      if (replace) window.history.replaceState(null, '', nextUrl.href)
      else window.history.pushState(null, '', nextUrl.href)
    } catch {
      /* file protocol may reject history updates */
    }
  }, [normalizeHashTarget])

  const navigateWorkspaceVirtualFile = useCallback(
    async (fileUrl, { hash = null } = {}) => {
      if (!fileUrl) return
      const current = normalizeFileUrlForCompare(currentFileUrlRef.current)
      const target = normalizeFileUrlForCompare(fileUrl)
      if (current === target) return

      const entry = workspaceVirtualReadersRef.current?.get(fileUrl)
      if (!entry) {
        bridge?.showToast?.('Linked file is no longer available')
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
        if (!nextMarkdown.trim()) {
          bridge?.showToast?.('Linked file is empty')
          return
        }

        bridge?.setMarkdown?.(nextMarkdown)
        bridge?.setSmoothInitialHashScroll?.(false)
        setCurrentFileUrl(fileUrl)
        await bridge?.render?.({ preserveScroll: false, honorHash: false })
        const scrolledToHash = hash && scrollToHeadingHash(hash)
        if (!scrolledToHash) {
          bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
        }
        focusAfterNavigation(bridge, hash)
        if (scrolledToHash) deferredScrollRetry(bridge, hash, scrollToHeadingHash)
        document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
      } catch (error) {
        logger.warn('Failed to navigate to workspace virtual file.', error)
        bridge?.showToast?.('Could not read linked file')
      } finally {
        bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
      }

    if (explorerModeRef.current === 'workspace') {
      safePatch({ activeFileUrl: currentFileUrlRef.current, filesContext: buildFilesContext() })
      revealFileInTree(currentFileUrlRef.current)
      syncExplorerBackButton()
      return
    }
    await runSiblingScan.current?.(currentFileUrlRef.current)
  },
    [bridge, buildFilesContext, revealFileInTree, safePatch, scrollToHeadingHash, setCurrentFileUrl, syncExplorerBackButton]
  )

  navigateToFile.current = async (
    fileUrl,
    { replaceHistory = false, forceReload = false, hash = null } = {}
  ) => {
    if (!fileUrl) return
    if (isWorkspaceVirtualHref(fileUrl)) {
      await navigateWorkspaceVirtualFile(fileUrl, { hash })
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
      if (!response?.ok) {
        const msg = /permission|denied|access/i.test(response?.error || '')
          ? 'Could not read linked file'
          : 'Could not open linked file'
        bridge?.showToast?.(msg)
        return
      }
      const nextMarkdown = String(response.data?.text || '')
      if (!nextMarkdown.trim()) {
        bridge?.showToast?.('Linked file is empty')
        return
      }

      bridge?.setMarkdown?.(nextMarkdown)
      bridge?.setSmoothInitialHashScroll?.(false)
      setCurrentFileUrl(fileUrl)
      await bridge?.render?.({ preserveScroll: false, honorHash: false })
      updateUrlWithoutReload(fileUrl, { replace: replaceHistory, hash })
      const scrolledToHash = hash && scrollToHeadingHash(hash)
      if (!scrolledToHash) {
        bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
      }
      focusAfterNavigation(bridge, hash)
      if (scrolledToHash) deferredScrollRetry(bridge, hash, scrollToHeadingHash)
      document.title = `${markdownFileTitleFromUrl(fileUrl)} - Markdown Plus`
    } catch (error) {
      logger.warn('Failed to navigate to sibling markdown file.', error)
      bridge?.showToast?.('Could not open linked file')
    } finally {
      bridge?.getArticleEl?.()?.removeAttribute('aria-busy')
    }

    if (explorerModeRef.current === 'workspace') {
      safePatch({ activeFileUrl: currentFileUrlRef.current, filesContext: buildFilesContext() })
      revealFileInTree(currentFileUrlRef.current)
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
      revealFileInTree(currentFileUrlRef.current)
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
