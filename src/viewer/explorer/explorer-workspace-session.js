import { logger } from '../../shared/logger.js'
import {
  pickFilesWithWebkitDirectory,
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList,
  tryFileDirectoryUrlFromWebkitFiles
} from './workspace-picker.js'
import { scanFolderRecursive } from './folder-scanner.js'
import { injectCurrentMarkdownAtRootIfMissing } from './explorer-files-context.js'
import {
  clearWorkspaceRootUrl,
  getWorkspaceRootUrl,
  getOriginalFileUrl,
  isOnOriginalFile,
  setExplorerMode,
  setWorkspaceRootUrl
} from './explorer-state.js'
import {
  isWorkspaceVirtualHref,
  normalizeDirectoryUrl
} from './url-utils.js'
import { isAbortError, throwIfAborted } from './explorer-scan-session.js'
import { workspaceDocumentStillValid } from './explorer-navigation.js'

function workspaceLabelFromNormalizedDirUrl(normalizedDirUrl, fallback = 'Workspace') {
  if (!normalizedDirUrl) return fallback
  try {
    const pathname = new URL(normalizedDirUrl).pathname.replace(/\/+$/, '')
    try {
      return decodeURIComponent(pathname) || fallback
    } catch {
      return pathname || fallback
    }
  } catch {
    return fallback
  }
}

export function createExplorerWorkspaceSession(deps) {
  const {
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
  } = deps

  const resetSiblingRefsForWorkspace = () => {
    refs.siblingTreeRef.current = null
    refs.siblingFolderLabelRef.current = ''
    refs.siblingScanRootUrlRef.current = null
  }

  const enterWorkspaceScan = ({ displayLabel, progressHeadline }) => {
    siblingScanSession?.abort?.()
    resetSiblingRefsForWorkspace()
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    const signal = workspaceScanSession.start()
    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()
    setExplorerMode('workspace')
    refs.explorerModeRef.current = 'workspace'
    safePatch({ explorerMode: 'workspace' })

    viewActions.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: displayLabel || '…',
      onCancel: () => workspaceScanSession.abort(),
      progressHeadline,
      filesContext: buildFilesContext({
        scanPhase: 'scanning',
        workspaceDisplayLabel: displayLabel || 'Folder'
      })
    })

    return { signal, maxScanDepth, maxFiles, maxFolders }
  }

  const openWorkspaceFromDirectoryHandle = async (dirHandle) => {
    if (!dirHandle) return
    const { signal, maxScanDepth, maxFiles, maxFolders } = enterWorkspaceScan({
      displayLabel: dirHandle.name || 'Folder',
      progressHeadline: 'Scanning picked folder…'
    })

    try {
      const { tree, stats, readers } = await scanWorkspaceFromDirectoryHandle(dirHandle, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        currentFileUrl: refs.currentFileUrlRef.current,
        onProgress: (progress) => {
          viewActions.updateProgressLoading({
            scannedFiles: progress.scannedFiles,
            scannedFolders: progress.scannedFolders,
            currentFolder: progress.currentFolder
          })
        }
      })
      throwIfAborted(signal)
      refs.workspaceVirtualReadersRef.current = readers
      await finalizeWorkspaceTree(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: dirHandle.name || 'Workspace'
      })
    } catch (error) {
      const aborted = isAbortError(error, signal)
      logger.warn('Workspace directory-handle scan failed.', error)
      if (aborted) await failWorkspaceToSibling('')
      else await failWorkspaceToSibling('Could not scan folder')
    } finally {
      workspaceScanSession.clear(signal)
    }
  }

  const openWorkspaceFromVirtualWebkitFiles = async (files) => {
    if (!files?.length) return
    const { signal, maxScanDepth, maxFiles, maxFolders } = enterWorkspaceScan({
      displayLabel: 'Imported folder',
      progressHeadline: 'Scanning imported folder…'
    })

    try {
      const { tree, stats, readers } = await scanWorkspaceFromWebkitFileList(files, {
        maxScanDepth,
        maxFiles,
        maxFolders,
        signal,
        onProgress: (progress) => {
          viewActions.updateProgressLoading({
            scannedFiles: progress.scannedFiles,
            scannedFolders: progress.scannedFolders,
            currentFolder: progress.currentFolder
          })
        }
      })
      throwIfAborted(signal)
      refs.workspaceVirtualReadersRef.current = readers
      await finalizeWorkspaceTree(tree, stats, {
        maxScanDepth,
        workspaceLabelOverride: tree.name || 'Workspace'
      })
    } catch (error) {
      const aborted = isAbortError(error, signal)
      logger.warn('Workspace webkitdirectory scan failed.', error)
      if (aborted) await failWorkspaceToSibling('')
      else await failWorkspaceToSibling('Could not scan folder')
    } finally {
      workspaceScanSession.clear(signal)
    }
  }

  const openWorkspaceFolder = async (dirUrl, opts = {}) => {
    const { restore = false } = opts
    if (!dirUrl) return
    const normalized = normalizeDirectoryUrl(dirUrl)
    siblingScanSession?.abort?.()
    resetSiblingRefsForWorkspace()
    clearWorkspaceVirtualReaders()
    const signal = workspaceScanSession.start()
    const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()

    setExplorerMode('workspace')
    setWorkspaceRootUrl(normalized)
    refs.explorerModeRef.current = 'workspace'
    safePatch({ explorerMode: 'workspace' })

    const scanContextLabel = workspaceLabelFromNormalizedDirUrl(normalized, normalized)
    viewActions.showProgressLoading({
      scannedFiles: 0,
      scannedFolders: 0,
      currentFolder: normalized,
      onCancel: () => workspaceScanSession.abort(),
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
        currentFileUrl: refs.currentFileUrlRef.current,
        siblingsFirstAtRoot: true,
        onProgress: (progress) => {
          viewActions.updateProgressLoading({
            scannedFiles: progress.scannedFiles,
            scannedFolders: progress.scannedFolders,
            currentFolder: progress.currentFolder
          })
        }
      })
      throwIfAborted(signal)

      await finalizeWorkspaceTree(tree, stats, {
        maxScanDepth,
        normalizedDirUrl: normalized
      })
    } catch (error) {
      const aborted = isAbortError(error, signal)
      logger.warn('Workspace folder scan failed.', error)
      if (aborted) await failWorkspaceToSibling('')
      else await failWorkspaceToSibling(restore ? 'Could not restore workspace' : 'Could not scan folder')
    } finally {
      workspaceScanSession.clear(signal)
    }
  }

  const pickAndOpenAnotherWorkspaceFolder = async () => {
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
      bridge?.showToast?.(error?.message || 'Could not open folder')
    }
  }

  const exitWorkspace = async () => {
    workspaceScanSession.abort()
    clearWorkspaceVirtualReaders()
    clearWorkspaceRootUrl()
    setExplorerMode('sibling')
    refs.explorerModeRef.current = 'sibling'
    refs.workspaceTreeRef.current = null
    refs.workspaceDisplayLabelRef.current = ''
    safePatch({ explorerMode: 'sibling' })

    const wasWorkspaceVirtualDoc = isWorkspaceVirtualHref(refs.currentFileUrlRef.current)
    if (wasWorkspaceVirtualDoc) {
      setCurrentFileUrl(window.location.href)
    }

    const original = getOriginalFileUrl()
    const restoreOriginalDoc =
      Boolean(original) && (wasWorkspaceVirtualDoc || !isOnOriginalFile(refs.currentFileUrlRef.current))

    viewActions.showLoading({ filesContext: buildFilesContext() })
    if (restoreOriginalDoc) {
      await navigateToFileRef.current?.(original, {
        replaceHistory: true,
        forceReload: wasWorkspaceVirtualDoc
      })
      return
    }
    await runSiblingScan(refs.currentFileUrlRef.current)
  }

  const finalizeWorkspaceTree = async (tree, stats, opts) => {
    const rootForInject =
      (opts.normalizedDirUrl && String(opts.normalizedDirUrl)) || getWorkspaceRootUrl() || ''
    injectCurrentMarkdownAtRootIfMissing(
      tree,
      refs.currentFileUrlRef.current,
      stats,
      rootForInject.startsWith('file:') ? rootForInject : undefined
    )

    refs.workspaceTreeRef.current = tree

    const current = refs.currentFileUrlRef.current
    if (
      current &&
      !workspaceDocumentStillValid({
        currentFileUrl: current,
        tree,
        rootForInject
      })
    ) {
      await resetViewerToPickWorkspaceFile()
    }

    const workspaceLabel = opts.normalizedDirUrl
      ? workspaceLabelFromNormalizedDirUrl(opts.normalizedDirUrl, opts.workspaceLabelOverride || tree.name || 'Workspace')
      : opts.workspaceLabelOverride || tree.name || 'Workspace'
    refs.workspaceDisplayLabelRef.current = workspaceLabel

    viewActions.showTree(tree, {
      workspaceLabel,
      stats,
      maxScanDepth: opts.maxScanDepth,
      showBack: false,
      actionsMode: 'workspace',
      filesContext: buildFilesContext()
    })
  }

  return {
    openWorkspaceFromDirectoryHandle,
    openWorkspaceFromVirtualWebkitFiles,
    openWorkspaceFolder,
    pickAndOpenAnotherWorkspaceFolder,
    exitWorkspace,
    finalizeWorkspaceTree
  }
}
