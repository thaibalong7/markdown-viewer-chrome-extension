import { DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE } from '../../shared/constants/explorer.js'

/** Shared policy for the document session and the Files explorer on startup. */
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
