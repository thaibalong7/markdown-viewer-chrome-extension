import { logger } from '../../shared/logger.js'
import { isWorkspaceVirtualHref } from './url-utils.js'

export function getFileListRefreshUnavailableReason({ mode, workspaceRootUrl, currentFileUrl }) {
  if (mode === 'workspace') return workspaceRootUrl ? '' : 'Select the folder again to refresh its file list'
  if (!currentFileUrl) return 'Open a supported file before refreshing its folder list'
  return isWorkspaceVirtualHref(currentFileUrl) ? 'Select the folder again to refresh its file list' : ''
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
    showToast?.('Refreshed file list', { variant: 'success' })
    return true
  } catch (error) {
    if (error?.name === 'AbortError') return false
    logger.warn('Failed to refresh explorer file list.', error)
    showToast?.('Could not refresh file list. The open document was kept.', { variant: 'error' })
    return false
  }
}
