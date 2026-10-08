import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { getLightDarkThemeToggleTarget } from '../../../theme/index.js'
import {
  buildExportFilename,
  exportAsHtml,
  exportAsWord,
  printDocument
} from '../../actions/document-actions.js'
import { canCopyCurrentFileLink, copyCurrentFileLink } from '../../actions/file-link-actions.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { useEditorState, useEditorDispatch } from '../contexts/EditorContext.jsx'
import { useCopyFeedback } from '../hooks/useCopyFeedback.js'
import { useDismissableLayer } from '../hooks/useDismissableLayer.js'
import { ActionMenu } from './common/ActionMenu.jsx'
import { IconButton } from './common/IconButton.jsx'
import { ExportIcon } from './icons/ExportIcon.jsx'
import { PrintIcon } from './icons/PrintIcon.jsx'
import { EditIcon } from './icons/EditIcon.jsx'
import { SaveIcon } from './icons/SaveIcon.jsx'
import { FocusIcon } from './icons/FocusIcon.jsx'
import { CopyLinkIcon } from './icons/CopyLinkIcon.jsx'
import { ThemeToggleIcon } from './icons/ThemeToggleIcon.jsx'
import { isEditorFeatureEnabled } from '../../../shared/constants/editor.js'
import { getDisplayPathFromFileUrl } from '../../editor/file-io.js'
import { WatchStatus } from './WatchStatus.jsx'
import { ChangeReview } from './ChangeReview.jsx'
import { EditFileConnectDialog } from './EditFileConnectDialog.jsx'
import { ExitEditConfirmation } from './ExitEditConfirmation.jsx'

export function FloatingActions({
  getArticleEl,
  getSettings,
  getCurrentFileUrl,
  documentUiState,
  watchState,
  onWatchCheck,
  onWatchApply,
  onReviewSectionNavigate,
  onPrepareEdit,
  onSave,
  saveStatus = 'saved',
  onViewModeChange,
  onThemeToggle
}) {
  const exportBtnRef = useRef(null)
  const exportWrapRef = useRef(null)
  const editButtonRef = useRef(null)
  const { showToast } = useToast()
  const editorState = useEditorState()
  const editorDispatch = useEditorDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [connectingFile, setConnectingFile] = useState(false)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const currentFileUrl = getCurrentFileUrl?.() || ''
  const capabilities = documentUiState?.capabilities || {}
  const isLoading = documentUiState?.loading === true
  const visible = Boolean(String(currentFileUrl).trim() || documentUiState?.displayName)
  const canCopyLink = canCopyCurrentFileLink(currentFileUrl)
  const isLocalFile = currentFileUrl.startsWith('file:')
  const supportsEditing = capabilities.edit === true && isLocalFile
  const editorFeatureEnabled = isEditorFeatureEnabled(getSettings?.())
  const preservingDirtySession = editorState.enabled && editorState.dirty
  const canEdit = supportsEditing && (editorFeatureEnabled || preservingDirtySession)
  const canStartEdit = supportsEditing && editorFeatureEnabled
  const editTargetPath = getDisplayPathFromFileUrl(currentFileUrl)
  const canExport = capabilities.exportDocument === true
  const canPrint = capabilities.print === true
  const viewModes = Array.isArray(capabilities.viewModes) ? capabilities.viewModes : []
  const canToggleViewMode = viewModes.includes('rendered') && viewModes.includes('raw')
  const isRawMode = documentUiState?.viewMode === 'raw'
  const currentThemePreset = String(getSettings?.()?.theme?.activeId || '').toLowerCase()
  const themeToggleTarget = getLightDarkThemeToggleTarget(currentThemePreset)
  const canToggleTheme = Boolean(themeToggleTarget && typeof onThemeToggle === 'function')
  useEffect(() => {
    if (!visible || isLoading) setMenuOpen(false)
  }, [isLoading, visible])

  useEffect(() => {
    if (editorState.enabled) setMenuOpen(false)
  }, [editorState.enabled])

  useEffect(() => {
    if (!editorState.enabled || !editorState.dirty || isLoading) setExitDialogOpen(false)
  }, [editorState.enabled, editorState.dirty, isLoading])

  useEffect(() => {
    if (editorState.enabled && (!supportsEditing || (!editorFeatureEnabled && !editorState.dirty))) {
      editorDispatch({ type: 'EXIT_EDIT' })
    }
  }, [editorDispatch, editorFeatureEnabled, editorState.dirty, editorState.enabled, supportsEditing])

  const menuItems = useMemo(
    () => [
      { label: 'HTML', ext: 'html', exportFn: exportAsHtml, errorMsg: 'Could not export HTML' },
      {
        label: 'Word (.doc)',
        ext: 'doc',
        exportFn: exportAsWord,
        errorMsg: 'Could not export Word document'
      }
    ],
    []
  )

  const closeExportMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  useDismissableLayer({
    open: menuOpen,
    layerRef: exportWrapRef,
    onDismiss: closeExportMenu,
    restoreFocusRef: exportBtnRef,
    preventEscapeDefault: true
  })

  const runExport = (ext, exportFn, errorMsg) => {
    void (async () => {
      const article = getArticleEl?.()
      if (!article) {
        showToast?.('Nothing to export yet.', { variant: 'warning' })
        return
      }
      const filename = buildExportFilename(getCurrentFileUrl?.(), ext)
      try {
        await exportFn(article, getSettings?.(), filename)
        showToast?.(`Exported ${filename}`, { variant: 'success' })
      } catch {
        showToast?.(errorMsg, { variant: 'error' })
      }
    })()
  }

  const onPrintClick = () => {
    setMenuOpen(false)
    printDocument()
  }

  const onExportToggleClick = (ev) => {
    ev.stopPropagation()
    setMenuOpen((open) => !open)
  }

  const onEditClick = () => {
    if (saveStatus === 'saving') return
    setMenuOpen(false)
    if (editorState.enabled && editorState.dirty) {
      setExitDialogOpen(true)
      return
    }
    if (editorState.enabled) {
      editorDispatch({ type: 'TOGGLE_EDIT' })
      return
    }
    if (canStartEdit) setConnectDialogOpen(true)
  }

  const onDiscardChanges = () => {
    if (saveStatus === 'saving' || isLoading || !editorState.enabled) return
    setExitDialogOpen(false)
    editorDispatch({ type: 'EXIT_EDIT' })
  }

  const onConnectConfirm = () => {
    if (connectingFile) return
    setConnectingFile(true)
    void (async () => {
      try {
        const ready = await onPrepareEdit?.()
        if (!ready) return
        setConnectDialogOpen(false)
        editorDispatch({ type: 'ENTER_EDIT' })
      } catch {
        showToast?.('Could not connect the original file.', { variant: 'error' })
      } finally {
        setConnectingFile(false)
      }
    })()
  }

  const onSaveClick = () => {
    setMenuOpen(false)
    onSave?.()
  }

  const onCopyLinkClick = () => {
    setMenuOpen(false)
    void (async () => {
      try {
        await copyCurrentFileLink(getCurrentFileUrl?.())
        flashCopyLinkCopied()
        showToast?.('Copied file link', { variant: 'success' })
      } catch {
        showToast?.('Could not copy file link', { variant: 'error' })
      }
    })()
  }

  const onFocusToggleClick = () => {
    setMenuOpen(false)
    editorDispatch({ type: 'TOGGLE_FOCUS' })
  }

  const onViewModeToggleClick = () => {
    setMenuOpen(false)
    onViewModeChange?.(isRawMode ? 'rendered' : 'raw')
  }

  const onThemeToggleClick = () => {
    if (!canToggleTheme || themeSaving) return
    setMenuOpen(false)
    setThemeSaving(true)
    void (async () => {
      try {
        await onThemeToggle()
      } finally {
        setThemeSaving(false)
      }
    })()
  }

  return (
    <>
      <div
      className="mdp-floating-actions mdp-floating-actions--rail-strip"
      role="toolbar"
      aria-label="Document actions"
      hidden={!visible}
      aria-hidden={visible ? 'false' : 'true'}
    >
      <WatchStatus state={watchState} isEditMode={editorState.enabled} editorDirty={editorState.dirty} onCheck={onWatchCheck} onApply={onWatchApply} />
      <ChangeReview state={watchState} isEditMode={editorState.enabled} editorDirty={editorState.dirty} onApply={onWatchApply} onCheck={onWatchCheck} onSectionNavigate={onReviewSectionNavigate} />
      {canToggleTheme && (
        <IconButton
          tooltip={themeSaving
            ? 'Switching theme…'
            : `Switch to ${themeToggleTarget} theme`}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn mdp-fab-btn--theme"
          aria-label={`Switch to ${themeToggleTarget} theme`}
          pressed={currentThemePreset === 'dark'}
          disabled={themeSaving}
          onClick={onThemeToggleClick}
        >
          <ThemeToggleIcon
            className="mdp-fab-btn__icon"
            targetPreset={themeToggleTarget}
          />
        </IconButton>
      )}

      {!editorState.enabled && canToggleViewMode && (
        <IconButton
          tooltip={isRawMode ? 'View diagram' : 'View source'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn mdp-fab-btn--view-mode"
          activeClassName="mdp-fab-btn--active"
          aria-label={isRawMode ? 'View diagram' : 'View source'}
          pressed={isRawMode}
          disabled={isLoading}
          onClick={onViewModeToggleClick}
        >
          <span aria-hidden="true">{isRawMode ? '◇' : '</>'}</span>
        </IconButton>
      )}

      {!editorState.enabled && (
        <IconButton
          tooltip={
            canCopyLink
              ? copyLinkCopied
                ? 'Copied'
                : 'Copy open file link'
              : 'Copy link unavailable for workspace virtual files'
          }
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn mdp-fab-btn--copy-link"
          copiedClassName="is-copied"
          copied={copyLinkCopied}
          aria-label={copyLinkCopied ? 'Copied' : 'Copy open file link'}
          disabled={!canCopyLink || isLoading}
          onClick={onCopyLinkClick}
        >
          <CopyLinkIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {canEdit && (
        <IconButton
          ref={editButtonRef}
          tooltip={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className={`mdp-fab-btn mdp-fab-btn--edit${editorState.dirty ? ' mdp-fab-btn--dirty-dot' : ''}`}
          activeClassName="mdp-fab-btn--active"
          aria-label={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
          pressed={editorState.enabled}
          disabled={isLoading || saveStatus === 'saving'}
          onClick={onEditClick}
        >
          <EditIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {canEdit && editorState.enabled && (
        <IconButton
          tooltip={editorState.dirty ? 'Save (Ctrl+S)' : 'Save — no unsaved changes'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className={`mdp-fab-btn mdp-fab-btn--save${editorState.dirty ? ' is-dirty' : ''}`}
          aria-label="Save markdown file"
          disabled={saveStatus === 'saving'}
          onClick={onSaveClick}
        >
          <SaveIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {canEdit && editorState.enabled && (
        <IconButton
          tooltip={editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode — hide preview'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn"
          activeClassName="mdp-fab-btn--active"
          aria-label={editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode'}
          pressed={editorState.mode === 'focus'}
          onClick={onFocusToggleClick}
        >
          <FocusIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {!editorState.enabled && canPrint && (
        <IconButton
          tooltip="Print — Save as PDF in the dialog to export PDF."
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn"
          aria-label="Print — use Save as PDF in the print dialog."
          disabled={isLoading}
          onClick={onPrintClick}
        >
          <PrintIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {!editorState.enabled && canExport && (
        <ActionMenu
          ref={exportWrapRef}
          open={menuOpen}
          className="mdp-fab-export"
          triggerRef={exportBtnRef}
          triggerClassName="mdp-fab-btn mdp-fab-export__trigger"
          triggerIcon={<ExportIcon className="mdp-fab-btn__icon" />}
          triggerLabel="Download — HTML or Word (.doc)."
          triggerTooltip="Download — HTML or Word (.doc)."
          triggerShowDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          triggerDisabled={isLoading}
          menuClassName="mdp-fab-export__menu"
          menuLabel="Export format"
          itemClassName="mdp-fab-export__menu-item"
          onToggle={onExportToggleClick}
          items={menuItems.map((item) => ({
            key: item.ext,
            label: item.label,
            onClick: () => {
              setMenuOpen(false)
              runExport(item.ext, item.exportFn, item.errorMsg)
            }
          }))}
        />
      )}
      </div>
      <ExitEditConfirmation
        open={exitDialogOpen && editorState.enabled && editorState.dirty && !isLoading}
        busy={saveStatus === 'saving'}
        returnFocusRef={editButtonRef}
        onCancel={() => setExitDialogOpen(false)}
        onConfirm={onDiscardChanges}
      />
      <EditFileConnectDialog
        open={connectDialogOpen}
        busy={connectingFile}
        filePath={editTargetPath}
        onCancel={() => setConnectDialogOpen(false)}
        onConfirm={onConnectConfirm}
      />
    </>
  )
}
