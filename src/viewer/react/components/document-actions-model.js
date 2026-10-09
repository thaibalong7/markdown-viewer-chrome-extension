// Viewer-local catalog. Add commands here; toolbar, overflow and ordering share it.
// Side effects remain in the owning action services / FloatingActions callbacks.
export const DOCUMENT_ACTION_GROUPS = Object.freeze({
  quick: { label: 'Quick access', order: 10 },
  document: { label: 'Document', order: 20 },
  output: { label: 'Output', order: 30 }
})

export function createDocumentActions(context) {
  const c = context
  const editing = c.editorState.enabled
  return orderDocumentActions([
    { id: 'updates', group: 'quick', order: 10, pinned: true,
      visible: c.watchState?.available, control: c.controls.updates },
    { id: 'theme', group: 'quick', order: 20, pinned: true, visible: c.canToggleTheme,
      label: `Switch to ${c.themeToggleTarget} theme`,
      tooltip: c.themeSaving ? 'Switching theme…' : `Switch to ${c.themeToggleTarget} theme`,
      icon: c.themeToggleTarget === 'dark' ? 'moon' : 'sun',
      iconClassName: `mdp-fab-btn__theme-icon--${c.themeToggleTarget}`,
      className: 'mdp-fab-btn--theme', disabled: c.themeSaving, onClick: c.onThemeToggleClick },
    { id: 'review', group: 'document', order: 10, pinned: true,
      visible: c.canReview, control: c.controls.review },
    { id: 'save', group: 'document', order: 20, visible: c.canEdit && editing,
      label: 'Save markdown file', tooltip: c.saving ? 'Saving…' : c.editorState.dirty ? 'Save (Ctrl+S)' : 'Save — no unsaved changes',
      icon: 'save', className: `mdp-fab-btn--save${c.editorState.dirty ? ' is-dirty' : ''}`,
      disabled: c.isLoading || c.saving || !c.editorState.dirty, busy: c.saving, onClick: c.onSaveClick },
    { id: 'edit', group: 'document', order: editing ? 30 : 20, visible: c.canEdit,
      label: editing ? 'Exit edit mode' : 'Edit markdown', icon: editing ? 'check' : 'edit',
      className: `mdp-fab-btn--edit${c.editorState.dirty ? ' mdp-fab-btn--dirty-dot' : ''}`,
      pressed: editing, disabled: c.isLoading || c.saving, buttonRef: c.editButtonRef, onClick: c.onEditClick },
    { id: 'focus', group: 'document', order: 40, visible: c.canEdit && editing,
      label: c.editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode',
      tooltip: c.editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode — hide preview',
      icon: 'focus', pressed: c.editorState.mode === 'focus', onClick: c.onFocusToggleClick },
    { id: 'view-mode', group: 'document', order: 20, visible: !editing && c.canToggleViewMode,
      label: c.isRawMode ? 'View diagram' : 'View source', icon: c.isRawMode ? 'reader' : 'source',
      pressed: c.isRawMode, disabled: c.isLoading, onClick: c.onViewModeToggleClick },
    { id: 'copy', group: 'document', order: 50, visible: true,
      label: c.copyLinkCopied ? 'Copied' : 'Copy open file link', icon: c.copyLinkCopied ? 'check' : 'link',
      tooltip: !c.canCopyLink ? 'Copy link unavailable for workspace virtual files' : c.copyLinkCopied ? 'Copied' : 'Copy open file link',
      className: c.copyLinkCopied ? 'is-copied' : '',
      disabled: !c.canCopyLink || c.isLoading, onClick: c.onCopyLinkClick },
    { id: 'print', group: 'output', order: 10, visible: !editing && c.canPrint,
      label: 'Print / Save as PDF', tooltip: 'Print — Save as PDF in the dialog to export PDF.',
      icon: 'print', disabled: c.isLoading, onClick: c.onPrintClick },
    { id: 'export', group: 'output', order: 20, visible: !editing && c.canExport,
      label: 'Export document', tooltip: 'Export HTML or Word (.doc)', icon: 'export', disabled: c.isLoading,
      items: c.exportItems }
  ].filter(action => action.visible))
}

export function orderDocumentActions(actions) {
  const ids = new Set()
  for (const action of actions) {
    if (!DOCUMENT_ACTION_GROUPS[action.group]) throw new Error(`Unknown document action group: ${action.group}`)
    if (ids.has(action.id)) throw new Error(`Duplicate document action: ${action.id}`)
    if (action.control && !action.pinned) throw new Error(`Custom document action must be pinned: ${action.id}`)
    ids.add(action.id)
  }
  return [...actions].sort((a, b) => DOCUMENT_ACTION_GROUPS[a.group].order - DOCUMENT_ACTION_GROUPS[b.group].order || a.order - b.order)
}

export function getDocumentActionsSize(actions, { controlSize = 28, gap = 4, dividerSize = 8 } = {}) {
  return actions.reduce((size, action, index) => size + controlSize + (index ? gap + (action.group && action.group !== actions[index - 1].group ? dividerSize : 0) : 0), 0)
}

export function partitionDocumentActions(actions, metrics = {}) {
  const pinnedCount = actions.reduce((count, action, index) => action.pinned ? index + 1 : count, 0)
  let count = actions.length
  const availableSize = Math.max(0, metrics.availableSize ?? Infinity)
  while (count > pinnedCount) {
    const row = [...actions.slice(0, count), ...(count < actions.length ? [{ id: 'more' }] : [])]
    if (getDocumentActionsSize(row, metrics) <= availableSize) break
    count--
  }
  return { direct: actions.slice(0, count), overflow: actions.slice(count) }
}

export function getOverflowDocumentActions(actions) {
  return actions.flatMap(action => action.items
    ? action.items.map(item => ({ ...item, group: action.group, disabled: action.disabled || item.disabled }))
    : [action])
}
