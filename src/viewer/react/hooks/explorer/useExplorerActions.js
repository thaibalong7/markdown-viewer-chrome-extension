import { useMemo } from 'react'

export function useExplorerActions({
  safePatch,
  navigateToFileRef,
  pickAndOpenAnotherWorkspaceFolder,
  exitWorkspace,
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
      safePatch,
      siblingScanSession,
      workspaceScanSession
    ]
  )
}
