import { logger } from '../../shared/logger.js'
import { scanFolderRecursive } from './folder-scanner.js'
import { scanSiblingFiles } from './sibling-scanner.js'
import { injectCurrentMarkdownAtRootIfMissing } from './explorer-files-context.js'
import { getParentDirectoryPathLabel, getParentDirectoryUrl, normalizeDirectoryUrl } from './url-utils.js'

export function scanCancelledError() {
  const err = new Error('Scan cancelled')
  err.name = 'AbortError'
  return err
}

export function isAbortError(error, signal) {
  return Boolean(error?.name === 'AbortError' || signal?.aborted)
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw scanCancelledError()
}

export function abortControllerSafe(controller) {
  if (!controller) return
  try {
    controller.abort()
  } catch {
    /* ignore */
  }
}

export function createAbortableScanSession() {
  let controller = null

  const abort = () => {
    abortControllerSafe(controller)
    controller = null
  }

  const start = () => {
    abort()
    controller = new AbortController()
    return controller.signal
  }

  const clear = (signal) => {
    if (!signal || controller?.signal === signal) controller = null
  }

  const currentSignal = () => controller?.signal ?? null

  return {
    abort,
    start,
    clear,
    currentSignal
  }
}

function directoryPathLabelFromUrl(dirUrl) {
  try {
    const u = new URL(dirUrl)
    let path = u.pathname
    if (path.endsWith('/')) path = path.slice(0, -1)
    try {
      return decodeURIComponent(path)
    } catch {
      return path
    }
  } catch {
    return ''
  }
}

export function createSiblingScanRunner(deps) {
  const {
    scanSession,
    refs,
    getScanLimits,
    buildFilesContext,
    siblingBackNavigationForUrl,
    finalizeSiblingTreePresent,
    viewActions
  } = deps

  return async function runSiblingScan(urlForScan, opts = {}) {
    const activeFileUrl = opts.activeFileUrl || urlForScan
    const signal = scanSession.start()
    const nav = siblingBackNavigationForUrl(activeFileUrl)
    const ctxBase = {
      showBack: nav.showBack,
      backLabel: nav.backLabel,
      onBack: nav.onBack,
      currentFileUrl: activeFileUrl,
      filesContext: buildFilesContext()
    }

    const resetSiblingRefs = () => {
      refs.siblingTreeRef.current = null
      refs.siblingFolderLabelRef.current = ''
      refs.siblingScanRootUrlRef.current = null
    }

    try {
      const scanRootDirUrl = opts.rootDirUrl
        ? normalizeDirectoryUrl(opts.rootDirUrl)
        : getParentDirectoryUrl(urlForScan)
      if (!scanRootDirUrl) {
        let files = []
        try {
          files = await scanSiblingFiles(urlForScan, { signal })
          throwIfAborted(signal)
        } catch (error) {
          if (isAbortError(error, signal)) return
          logger.warn('Sibling scan failed.', error)
        }
        resetSiblingRefs()
        if (!files.length) {
          viewActions.showEmpty(ctxBase)
          return
        }
        viewActions.showFiles(files, ctxBase)
        return
      }

      const { maxScanDepth, maxFiles, maxFolders } = getScanLimits()
      const folderLabel =
        opts.folderLabel ||
        (opts.rootDirUrl ? directoryPathLabelFromUrl(scanRootDirUrl) : getParentDirectoryPathLabel(urlForScan))
      refs.siblingTreeRef.current = null
      refs.siblingFolderLabelRef.current = folderLabel
      refs.siblingScanRootUrlRef.current = null

      try {
        viewActions.showProgressLoading({
          scannedFiles: 0,
          scannedFolders: 0,
          currentFolder: scanRootDirUrl,
          progressHeadline: 'Scanning folder tree…',
          filesContext: buildFilesContext({
            scanPhase: 'scanning',
            siblingFolderLabel: folderLabel
          })
        })

        const { tree, stats } = await scanFolderRecursive(scanRootDirUrl, {
          maxScanDepth,
          maxFiles,
          maxFolders,
          signal,
          currentFileUrl: activeFileUrl,
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

        injectCurrentMarkdownAtRootIfMissing(tree, activeFileUrl, stats, normalizeDirectoryUrl(scanRootDirUrl))
        finalizeSiblingTreePresent(tree, stats, { maxScanDepth, folderLabel })
      } catch (error) {
        if (isAbortError(error, signal)) return
        logger.warn('Deep sibling scan failed.', error)
        resetSiblingRefs()

        let files = []
        try {
          files = await scanSiblingFiles(urlForScan, { signal })
          throwIfAborted(signal)
        } catch (flatError) {
          if (isAbortError(flatError, signal)) return
          logger.warn('Flat sibling fallback failed.', flatError)
        }

        if (!files.length) {
          viewActions.showEmpty(ctxBase)
          return
        }
        viewActions.showFiles(files, ctxBase)
      }
    } finally {
      scanSession.clear(signal)
    }
  }
}
