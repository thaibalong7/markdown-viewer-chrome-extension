export function getExplorerHeaderButtonState({ actionsMode, showBack }) {
  const isWorkspaceMode = actionsMode === 'workspace'
  const isSiblingMode = actionsMode === 'sibling'

  return {
    leaveWorkspaceHidden: !isWorkspaceMode,
    backHidden: !isSiblingMode,
    backDisabled: !isSiblingMode || !showBack
  }
}
