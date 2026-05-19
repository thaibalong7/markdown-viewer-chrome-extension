import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { logger } from '../../../shared/logger.js'
import { createExplorerViewActions } from './explorer/createExplorerViewActions.js'
import { createInitialState, explorerReducer } from './explorer/explorerReducer.js'
import { useExplorerActions } from './explorer/useExplorerActions.js'
import { useExplorerBridgeRegistration } from './explorer/useExplorerBridgeRegistration.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH
} from '../../../shared/constants/explorer.js'
import { sendMessage } from '../../../messaging/index.js'
import {
  buildExplorerFilesContext
} from '../../explorer/explorer-files-context.js'
import {
  clearWorkspaceRootUrl,
  getExplorerMode,
  getOriginalFileUrl,
  getWorkspaceRootUrl,
  setExplorerMode,
  setOriginalFileUrlIfUnset
} from '../../explorer/explorer-state.js'
import {
  createAbortableScanSession,
  createSiblingScanRunner
} from '../../explorer/explorer-scan-session.js'
import {
  createExplorerNavigator,
  createSiblingBackNavigationForUrl
} from '../../explorer/explorer-navigation.js'
import { createExplorerWorkspaceSession } from '../../explorer/explorer-workspace-session.js'
import {
  fileUrlIsUnderDirectoryUrl,
  getParentDirectoryUrl,
  isWorkspaceVirtualHref,
  normalizeDirectoryUrl
} from '../../explorer/url-utils.js'

export function getInitialExplorerFileUrl(bridge) {
  const bridgedUrl = bridge?.getCurrentFileUrl?.()
  if (typeof bridgedUrl === 'string' && bridgedUrl.trim()) {
    return bridgedUrl
  }
  return typeof window !== 'undefined' ? window.location.href : ''
}

function getSiblingRefreshScanOptions({
  currentFileUrl,
  originalFileUrl,
  siblingScanRootUrl,
  siblingFolderLabel
}) {
  const originalRootUrl = getParentDirectoryUrl(originalFileUrl)
  const rootDirUrl =
    originalRootUrl && fileUrlIsUnderDirectoryUrl(currentFileUrl, originalRootUrl)
      ? originalRootUrl
      : siblingScanRootUrl
  const normalizedRootDirUrl = rootDirUrl ? normalizeDirectoryUrl(rootDirUrl) : ''
  const normalizedSiblingRootUrl = siblingScanRootUrl ? normalizeDirectoryUrl(siblingScanRootUrl) : ''

  return {
    activeFileUrl: currentFileUrl,
    rootDirUrl,
    folderLabel: normalizedRootDirUrl === normalizedSiblingRootUrl ? siblingFolderLabel : ''
  }
}

/** React composition hook for the Files explorer. */
export function useExplorer({ bridge }) {
  const [state, dispatch] = useReducer(explorerReducer, undefined, createInitialState)
  const mountedRef = useRef(false)
  const stateRef = useRef(state)
  const workspaceScanSession = useMemo(() => createAbortableScanSession(), [])
  const siblingScanSession = useMemo(() => createAbortableScanSession(), [])

  const workspaceVirtualReadersRef = useRef(null)
  const backActionRef = useRef(null)
  const navigateToFileRef = useRef(null)
  const runSiblingScanRef = useRef(null)

  const explorerModeRef = useRef('sibling')
  const currentFileUrlRef = useRef(getInitialExplorerFileUrl(bridge))
  const workspaceTreeRef = useRef(null)
  const siblingTreeRef = useRef(null)
  const siblingFolderLabelRef = useRef('')
  const siblingScanRootUrlRef = useRef(null)
  const workspaceDisplayLabelRef = useRef('')

  const refs = useMemo(
    () => ({
      explorerModeRef,
      currentFileUrlRef,
      workspaceTreeRef,
      siblingTreeRef,
      siblingFolderLabelRef,
      siblingScanRootUrlRef,
      workspaceDisplayLabelRef,
      workspaceVirtualReadersRef
    }),
    []
  )

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

  const buildFilesContext = useCallback((opts = {}) => {
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
  }, [])

  const setCurrentFileUrl = useCallback(
    (nextUrl) => {
      const url = typeof nextUrl === 'string' ? nextUrl : ''
      currentFileUrlRef.current = url
      safePatch({ currentFileUrl: url, activeFileUrl: url })
      bridge?.updateCurrentFileUrl?.(url)
    },
    [bridge, safePatch]
  )

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

  const viewActions = useMemo(
    () =>
      createExplorerViewActions({
        stateRef,
        safePatch,
        setBackNavigation,
        currentFileUrlRef
      }),
    [safePatch, setBackNavigation]
  )

  const siblingBackNavigationForUrl = useCallback(
    (openUrl) => createSiblingBackNavigationForUrl(openUrl, navigateToFileRef.current),
    []
  )

  const resetViewerToPickWorkspaceFile = useCallback(async () => {
    bridge?.setMarkdown?.('# Select a file\n\nPick a Markdown file from the sidebar list.')
    setCurrentFileUrl('')
    bridge?.setSmoothInitialHashScroll?.(false)
    await bridge?.render?.({ preserveScroll: false, honorHash: false })
    bridge?.getScrollRoot?.()?.scrollTo({ top: 0, behavior: 'auto' })
    document.title = 'Markdown Plus'
  }, [bridge, setCurrentFileUrl])

  const syncExplorerBackButton = useCallback(() => {
    if (explorerModeRef.current === 'workspace') {
      setBackNavigation({ showBack: false })
      return
    }
    setBackNavigation(siblingBackNavigationForUrl(currentFileUrlRef.current))
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

      const nav = siblingBackNavigationForUrl(currentFileUrlRef.current)
      viewActions.showTree(tree, {
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
    [buildFilesContext, siblingBackNavigationForUrl, viewActions]
  )

  const runSiblingScan = useCallback((urlForScan, opts) => runSiblingScanRef.current?.(urlForScan, opts), [])

  const failWorkspaceToSibling = useCallback(
    async (message) => {
      viewActions.clearExplorerBody()
      if (message) bridge?.showToast?.(message, { variant: 'error' })
      clearWorkspaceVirtualReaders()
      clearWorkspaceRootUrl()
      setExplorerMode('sibling')
      explorerModeRef.current = 'sibling'
      workspaceTreeRef.current = null
      workspaceDisplayLabelRef.current = ''
      safePatch({ explorerMode: 'sibling' })
      await runSiblingScan(currentFileUrlRef.current)
    },
    [bridge, clearWorkspaceVirtualReaders, runSiblingScan, safePatch, viewActions]
  )

  useEffect(() => {
    runSiblingScanRef.current = createSiblingScanRunner({
      scanSession: siblingScanSession,
      refs,
      getScanLimits,
      buildFilesContext,
      siblingBackNavigationForUrl,
      finalizeSiblingTreePresent,
      viewActions
    })
  }, [
    buildFilesContext,
    finalizeSiblingTreePresent,
    getScanLimits,
    refs,
    siblingBackNavigationForUrl,
    siblingScanSession,
    viewActions
  ])

  const navigator = useMemo(
    () =>
      createExplorerNavigator({
        bridge,
        refs,
        stateRef,
        safePatch,
        buildFilesContext,
        setCurrentFileUrl,
        runSiblingScan,
        syncExplorerBackButton,
        sendMessage
      }),
    [bridge, buildFilesContext, refs, runSiblingScan, safePatch, setCurrentFileUrl, syncExplorerBackButton]
  )
  navigateToFileRef.current = navigator.navigateToFile

  const workspaceSession = useMemo(
    () =>
      createExplorerWorkspaceSession({
        bridge,
        refs,
        workspaceScanSession,
        siblingScanSession,
        getScanLimits,
        buildFilesContext,
        clearWorkspaceVirtualReaders,
        resetViewerToPickWorkspaceFile,
        failWorkspaceToSibling,
        setCurrentFileUrl,
        navigateToFileRef,
        runSiblingScan,
        safePatch,
        viewActions
      }),
    [
      bridge,
      buildFilesContext,
      clearWorkspaceVirtualReaders,
      failWorkspaceToSibling,
      getScanLimits,
      refs,
      resetViewerToPickWorkspaceFile,
      runSiblingScan,
      safePatch,
      siblingScanSession,
      setCurrentFileUrl,
      viewActions,
      workspaceScanSession
    ]
  )

  useExplorerBridgeRegistration({ bridge, navigateToFileRef, workspaceVirtualReadersRef })

  useEffect(() => {
    mountedRef.current = true
    const initialUrl = getInitialExplorerFileUrl(bridge)
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
      viewActions.showLoading({ filesContext: buildFilesContext() })
      void workspaceSession.openWorkspaceFolder(storedRoot, { restore: true })
    } else {
      explorerModeRef.current = 'sibling'
      safePatch({ explorerMode: 'sibling', filesContext: buildFilesContext() })
      viewActions.showLoading({ filesContext: buildFilesContext() })
      void runSiblingScan(initialUrl)
    }

    return () => {
      mountedRef.current = false
      workspaceScanSession.abort()
      siblingScanSession.abort()
      clearWorkspaceVirtualReaders()
    }
  }, [
    bridge,
    buildFilesContext,
    clearWorkspaceVirtualReaders,
    runSiblingScan,
    safePatch,
    setCurrentFileUrl,
    siblingScanSession,
    viewActions,
    workspaceScanSession,
    workspaceSession
  ])

  const refreshCurrentFileAndList = useCallback(async () => {
    const currentFileUrl = currentFileUrlRef.current || ''
    if (isWorkspaceVirtualHref(currentFileUrl)) {
      bridge?.showToast?.('Refresh is unavailable for virtual workspace files', { variant: 'warning' })
      return
    }

    const mode = explorerModeRef.current
    const workspaceRootUrl = getWorkspaceRootUrl()
    if (mode === 'workspace' && !workspaceRootUrl) {
      bridge?.showToast?.('Refresh is unavailable for virtual workspaces', { variant: 'warning' })
      return
    }

    safePatch({ isRefreshing: true })
    try {
      if (currentFileUrl.startsWith('file:')) {
        await navigator.navigateToFile(currentFileUrl, {
          replaceHistory: true,
          forceReload: true,
          syncExplorer: false
        })
      }

      if (mode === 'workspace') {
        await workspaceSession.openWorkspaceFolder(workspaceRootUrl, { restore: true })
      } else {
        await runSiblingScan(
          currentFileUrl,
          getSiblingRefreshScanOptions({
            currentFileUrl,
            originalFileUrl: getOriginalFileUrl(),
            siblingScanRootUrl: siblingScanRootUrlRef.current,
            siblingFolderLabel: siblingFolderLabelRef.current
          })
        )
      }
      bridge?.showToast?.('Refreshed file and list', { variant: 'success' })
    } catch (error) {
      logger.warn('Failed to refresh current file and explorer list.', error)
      bridge?.showToast?.('Could not refresh file and list', { variant: 'error' })
    } finally {
      safePatch({ isRefreshing: false })
    }
  }, [bridge, navigator, runSiblingScan, safePatch, workspaceSession])

  const actions = useExplorerActions({
    safePatch,
    navigateToFileRef,
    pickAndOpenAnotherWorkspaceFolder: workspaceSession.pickAndOpenAnotherWorkspaceFolder,
    exitWorkspace: workspaceSession.exitWorkspace,
    refreshCurrentFileAndList,
    backActionRef,
    workspaceScanSession,
    siblingScanSession,
    dispatch
  })

  return {
    state,
    actions
  }
}
