import { useMemo } from 'react'

export function createExplorerActions({
  navigateToFileRef,
  pickAndOpenAnotherWorkspaceFolder,
  exitWorkspace,
  refreshCurrentFileAndList,
  backActionRef,
  workspaceScanSession,
  siblingScanSession,
  dispatch
}) {
  return {
    onNavigate: (href) => {
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
  }
}

export function useExplorerActions({
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
    () =>
      createExplorerActions({
        navigateToFileRef,
        pickAndOpenAnotherWorkspaceFolder,
        exitWorkspace,
        refreshCurrentFileAndList,
        backActionRef,
        workspaceScanSession,
        siblingScanSession,
        dispatch
      }),
    [
      backActionRef,
      dispatch,
      exitWorkspace,
      navigateToFileRef,
      pickAndOpenAnotherWorkspaceFolder,
      refreshCurrentFileAndList,
      siblingScanSession,
      workspaceScanSession
    ]
  )
}
