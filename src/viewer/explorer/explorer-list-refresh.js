import { logger } from '../../shared/logger.js'
import { isWorkspaceVirtualHref } from './url-utils.js'

export function getFileListRefreshUnavailableReason({ mode, workspaceRootUrl, currentFileUrl }) {
  if (mode === 'workspace') return workspaceRootUrl ? '' : 'viewer.explorer.listRefresh.selectTheFolderAgainToRefreshItsFile'
  if (!currentFileUrl) return 'viewer.explorer.listRefresh.openASupportedFileBeforeRefreshingItsFolder'
  return isWorkspaceVirtualHref(currentFileUrl) ? 'viewer.explorer.listRefresh.selectTheFolderAgainToRefreshItsFile' : ''
}

/** List-only operation: intentionally has no document, navigation or editor dependencies. */
export async function refreshExplorerFileList({
  currentFileUrl, mode, workspaceRootUrl, siblingScanOptions,
  workspaceSession, runSiblingScan, showToast
}) {
  const unavailable = getFileListRefreshUnavailableReason({ mode, workspaceRootUrl, currentFileUrl })
  if (unavailable) {
    showToast?.(unavailable, { variant: 'warning' })
    return false
  }
  try {
    if (mode === 'workspace') {
      const refreshed = await workspaceSession.openWorkspaceFolder(workspaceRootUrl, {
        restore: true,
        preserveExpandedState: true,
        keepCurrentDocumentOnMissing: true,
        listOnly: true
      })
      if (refreshed === false) return false
    } else {
      const refreshed = await runSiblingScan(currentFileUrl, siblingScanOptions)
      if (refreshed === false) return false
    }
    showToast?.('viewer.explorer.listRefresh.refreshedFileList', { variant: 'success' })
    return true
  } catch (error) {
    if (error?.name === 'AbortError') return false
    logger.warn('Failed to refresh explorer file list.', error)
    showToast?.('errors.viewer.explorer.listRefresh.refreshFileListTheOpenDocumentWasKept', { variant: 'error' })
    return false
  }
}
