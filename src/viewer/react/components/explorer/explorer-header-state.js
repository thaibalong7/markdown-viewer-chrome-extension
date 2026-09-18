export function getExplorerHeaderButtonState({ actionsMode, showBack, actionsDisabled = false }) {
  const isWorkspaceMode = actionsMode === 'workspace'
  const isSiblingMode = actionsMode === 'sibling'

  return {
    openFolderDisabled: actionsDisabled,
    leaveWorkspaceHidden: !isWorkspaceMode,
    leaveWorkspaceDisabled: actionsDisabled,
    backHidden: !isSiblingMode,
    backDisabled: actionsDisabled || !isSiblingMode || !showBack
  }
}
