import { useMemo } from 'react'

export function useExplorerActions({
  safePatch,
  navigateToFileRef,
  pickAndOpenAnotherWorkspaceFolder,
  exitWorkspace,
  refreshCurrentFileAndList,
  backActionRef,
  workspaceScanSession,
  siblingScanSession,
  dispatch
}) {
  return useMemo(
    () => ({
      onNavigate: (href) => {
        safePatch({ activeFileUrl: href || '' })
        void navigateToFileRef.current?.(href)
      },
      onOpenAnotherFolder: () => {
        void pickAndOpenAnotherWorkspaceFolder()
      },
      onExitWorkspace: () => {
        void exitWorkspace()
      },
      onRefresh: () => {
        void refreshCurrentFileAndList()
      },
      onBack: () => {
        backActionRef.current?.()
      },
      onCancelProgress: () => {
        workspaceScanSession.abort()
        siblingScanSession.abort()
      },
      onToggleFolder: (href) => {
        dispatch({ type: 'TOGGLE_FOLDER', href })
      }
    }),
    [
      backActionRef,
      dispatch,
      exitWorkspace,
      navigateToFileRef,
      pickAndOpenAnotherWorkspaceFolder,
      refreshCurrentFileAndList,
      safePatch,
      siblingScanSession,
      workspaceScanSession
    ]
  )
}
