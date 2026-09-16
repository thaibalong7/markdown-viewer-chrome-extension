import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { logger } from '../../../shared/logger.js'
import { createExplorerViewActions } from './explorer/createExplorerViewActions.js'
import { createInitialState, explorerReducer } from './explorer/explorerReducer.js'
import { useExplorerActions } from './explorer/useExplorerActions.js'
import { useExplorerBridgeRegistration } from './explorer/useExplorerBridgeRegistration.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
  DEFAULT_EXPLORER_RESPECT_GITIGNORE,
  DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
} from '../../../shared/constants/explorer.js'
import {
  buildExplorerFilesContext
} from '../../explorer/explorer-files-context.js'
import {
  clearWorkspaceRootUrl,
  getExplorerExpandedMap,
  getExplorerExpandedStateRoot,
  getExplorerMode,
  getOriginalFileUrl,
  getWorkspaceRootUrl,
  setExplorerExpandedMap,
  setExplorerMode,
  setOriginalFileUrlIfUnset
} from '../../explorer/explorer-state.js'
import {
  createAbortableScanSession,
  createSiblingScanRunner
} from '../../explorer/explorer-scan-session.js'
import {
  createExplorerNavigator,
  createSiblingBackNavigationForUrl,
  navigateFromBrowserHistory
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

export function getSiblingRefreshScanOptions({
  currentFileUrl,
  originalFileUrl,
  siblingScanRootUrl,
  siblingFolderLabel,
  preserveExpandedState = false
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
    folderLabel: normalizedRootDirUrl === normalizedSiblingRootUrl ? siblingFolderLabel : '',
    preserveExpandedState
  }
}

export function resolveInitialExplorerStartup({
  storedMode,
  storedRoot,
  restoreLastWorkspace = DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
}) {
  if (restoreLastWorkspace && storedMode === 'workspace' && storedRoot) {
    return { mode: 'workspace', workspaceRoot: storedRoot }
  }
  return { mode: 'sibling', workspaceRoot: null }
}

export function launchInitialExplorerScan({
  startup,
  initialUrl,
  siblingScanOptions,
  runSiblingScan,
  openWorkspaceFolder
}) {
  if (startup.mode === 'workspace') {
    return openWorkspaceFolder(startup.workspaceRoot, {
      restore: true,
      keepCurrentDocumentOnMissing: true
    })
  }
  return runSiblingScan(initialUrl, siblingScanOptions)
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

  const refs = useMemo(
    () => ({
      explorerModeRef,
      currentFileUrlRef,
      workspaceTreeRef,
      siblingTreeRef,
      siblingFolderLabelRef,
      siblingScanRootUrlRef,
      workspaceVirtualReadersRef
    }),
    []
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!mountedRef.current || state.view !== 'tree' || !state.tree) return
    const fallbackRootUrl =
      state.explorerMode === 'workspace' ? getWorkspaceRootUrl() : siblingScanRootUrlRef.current
    const expandedStateRoot = getExplorerExpandedStateRoot(state.tree, fallbackRootUrl)
    setExplorerExpandedMap(state.explorerMode, expandedStateRoot, state.expandedMap)
  }, [state.expandedMap, state.explorerMode, state.tree, state.view])

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
    const respectGitignore =
      typeof ex.respectGitignore === 'boolean'
        ? ex.respectGitignore
        : DEFAULT_EXPLORER_RESPECT_GITIGNORE
    return { maxScanDepth, maxFiles, maxFolders, respectGitignore }
  }, [bridge])

  const buildFilesContext = useCallback((opts = {}) => {
    const scanPhase = opts.scanPhase === 'scanning' ? 'scanning' : 'idle'

    return buildExplorerFilesContext({
      explorerMode: explorerModeRef.current,
      currentFileUrl: currentFileUrlRef.current,
      workspaceTree: workspaceTreeRef.current,
      siblingTree: siblingTreeRef.current,
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
    const shown = await bridge?.showPlaceholder?.('Select a supported file from the Files panel.')
    if (shown === false) return
    setCurrentFileUrl('')
    bridge?.setSmoothInitialHashScroll?.(false)
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
      const expandedStateRoot = getExplorerExpandedStateRoot(tree, siblingScanRootUrlRef.current)
      const storedExpandedMap = getExplorerExpandedMap('sibling', expandedStateRoot)
      const preserveExpandedState = Boolean(opts.preserveExpandedState || storedExpandedMap)
      viewActions.showTree(tree, {
        workspaceLabel: siblingFolderLabelRef.current || tree.name || 'Folder',
        stats,
        maxScanDepth: opts.maxScanDepth,
        showBack: nav.showBack,
        backLabel: nav.backLabel,
        onBack: nav.onBack,
        actionsMode: 'sibling',
        listAriaLabel: 'Supported files in folder tree',
        filesContext: buildFilesContext(),
        expandedMap: opts.preserveExpandedState ? stateRef.current.expandedMap : storedExpandedMap,
        preserveExpandedState
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
        syncExplorerBackButton
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
        stateRef,
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
    const handlePopState = () => {
      if (explorerModeRef.current === 'workspace') {
        bridge?.resetBrowserRoute?.()
        return
      }
      void navigateFromBrowserHistory({
        locationHref: window.location.href,
        currentFileUrl: currentFileUrlRef.current,
        entryFileUrl: bridge?.getEntryFileUrl?.(),
        navigateToFile: navigateToFileRef.current,
        getLocationHref: () => window.location.href,
        getCurrentFileUrl: () => currentFileUrlRef.current
      }).catch((error) => {
        logger.warn('Failed to navigate browser history.', error)
      })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [bridge])

  useEffect(() => {
    mountedRef.current = true
    const initialUrl = getInitialExplorerFileUrl(bridge)
    setCurrentFileUrl(initialUrl)
    setOriginalFileUrlIfUnset(bridge?.getEntryFileUrl?.() || initialUrl)

    if (getExplorerMode() === 'workspace' && !getWorkspaceRootUrl()) {
      setExplorerMode('sibling')
    }

    const storedMode = getExplorerMode()
    const storedRoot = getWorkspaceRootUrl()
    const startup = resolveInitialExplorerStartup({
      storedMode,
      storedRoot,
      restoreLastWorkspace:
        bridge?.getSettings?.()?.explorer?.restoreLastWorkspace ??
        DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
    })
    if (startup.mode === 'workspace') {
      explorerModeRef.current = 'workspace'
      safePatch({ explorerMode: 'workspace', filesContext: buildFilesContext() })
      viewActions.showLoading({ filesContext: buildFilesContext() })
    } else {
      explorerModeRef.current = 'sibling'
      safePatch({ explorerMode: 'sibling', filesContext: buildFilesContext() })
      viewActions.showLoading({ filesContext: buildFilesContext() })
    }
    void launchInitialExplorerScan({
      startup,
      initialUrl,
      siblingScanOptions: getSiblingRefreshScanOptions({
        currentFileUrl: initialUrl,
        originalFileUrl: getOriginalFileUrl(),
        siblingScanRootUrl: siblingScanRootUrlRef.current,
        siblingFolderLabel: siblingFolderLabelRef.current
      }),
      runSiblingScan,
      openWorkspaceFolder: workspaceSession.openWorkspaceFolder
    })

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
      let restoredOriginalAfterMissingCurrent = false
      if (currentFileUrl.startsWith('file:')) {
        const refreshedCurrentFile = await navigator.navigateToFile(currentFileUrl, {
          replaceHistory: true,
          forceReload: true,
          syncExplorer: false
        })
        if (refreshedCurrentFile === false) {
          const originalFileUrl = getOriginalFileUrl()
          if (originalFileUrl && originalFileUrl !== currentFileUrl) {
            const restoredOriginal = await navigator.navigateToFile(originalFileUrl, {
              replaceHistory: true,
              forceReload: true,
              syncExplorer: false
            })
            if (restoredOriginal !== false) {
              restoredOriginalAfterMissingCurrent = true
            }
          }
        }
      }

      const refreshedFileUrl = currentFileUrlRef.current || currentFileUrl
      if (mode === 'workspace') {
        await workspaceSession.openWorkspaceFolder(workspaceRootUrl, {
          restore: true,
          preserveExpandedState: true
        })
      } else {
        await runSiblingScan(
          refreshedFileUrl,
          getSiblingRefreshScanOptions({
            currentFileUrl: refreshedFileUrl,
            originalFileUrl: getOriginalFileUrl(),
            siblingScanRootUrl: siblingScanRootUrlRef.current,
            siblingFolderLabel: siblingFolderLabelRef.current,
            preserveExpandedState: true
          })
        )
      }
      bridge?.showToast?.(
        restoredOriginalAfterMissingCurrent
          ? 'Current file was removed; returned to original file'
          : 'Refreshed file and list',
        { variant: restoredOriginalAfterMissingCurrent ? 'warning' : 'success' }
      )
    } catch (error) {
      logger.warn('Failed to refresh current file and explorer list.', error)
      bridge?.showToast?.('Could not refresh file and list', { variant: 'error' })
    } finally {
      safePatch({ isRefreshing: false })
    }
  }, [bridge, navigator, runSiblingScan, safePatch, workspaceSession])

  const actions = useExplorerActions({
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
