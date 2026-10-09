import React, { useEffect, useRef, useState } from 'react'
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
import { isEditorFeatureEnabled } from '../../../shared/constants/editor.js'
import { getDisplayPathFromFileUrl } from '../../editor/file-io.js'
import { WatchStatus } from './WatchStatus.jsx'
import { ChangeReview } from './ChangeReview.jsx'
import { EditFileConnectDialog } from './EditFileConnectDialog.jsx'
import { ExitEditConfirmation } from './ExitEditConfirmation.jsx'
import { createDocumentActions } from './document-actions-model.js'
import { DocumentActionToolbar } from './DocumentActionToolbar.jsx'

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
  const editButtonRef = useRef(null)
  const { showToast } = useToast()
  const editorState = useEditorState()
  const editorDispatch = useEditorDispatch()
  const [menuOpen, setMenuOpen] = useState(null)
  const [actionsLayout, setActionsLayout] = useState('')
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
    if (!visible || isLoading || editorState.enabled) setMenuOpen(null)
  }, [editorState.enabled, isLoading, visible])

  useEffect(() => {
    if (!editorState.enabled || !editorState.dirty || isLoading) setExitDialogOpen(false)
  }, [editorState.enabled, editorState.dirty, isLoading])

  useEffect(() => {
    if (editorState.enabled && (!supportsEditing || (!editorFeatureEnabled && !editorState.dirty))) {
      editorDispatch({ type: 'EXIT_EDIT' })
    }
  }, [editorDispatch, editorFeatureEnabled, editorState.dirty, editorState.enabled, supportsEditing])

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

  const onEditClick = () => {
    if (saveStatus === 'saving') return
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

  const onCopyLinkClick = () => {
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
    editorDispatch({ type: 'TOGGLE_FOCUS' })
  }

  const onViewModeToggleClick = () => {
    onViewModeChange?.(isRawMode ? 'rendered' : 'raw')
  }

  const onThemeToggleClick = () => {
    if (!canToggleTheme || themeSaving) return
    setThemeSaving(true)
    void (async () => {
      try {
        await onThemeToggle()
      } catch {
        showToast?.('Could not switch theme.', { variant: 'error' })
      } finally {
        setThemeSaving(false)
      }
    })()
  }

  const actionContext = {
    editorState, watchState, canEdit, canToggleTheme, themeToggleTarget, themeSaving,
    canToggleViewMode, isRawMode, canCopyLink, copyLinkCopied, canPrint, canExport,
    isLoading, saving: saveStatus === 'saving', editButtonRef,
    onThemeToggleClick, onEditClick, onSaveClick: onSave, onCopyLinkClick,
    onFocusToggleClick, onViewModeToggleClick, onPrintClick: printDocument,
    exportItems: [
      { id: 'html', label: 'Export HTML', icon: 'export',
        onClick: () => runExport('html', exportAsHtml, 'Could not export HTML') },
      { id: 'word', label: 'Export Word (.doc)', icon: 'export',
        onClick: () => runExport('doc', exportAsWord, 'Could not export Word document') }
    ],
    controls: {
      updates: <WatchStatus state={watchState} isEditMode={editorState.enabled}
        editorDirty={editorState.dirty} onCheck={onWatchCheck} onApply={onWatchApply}
        disabled={isLoading} dismissSignal={actionsLayout + ':' + (menuOpen || '')} />
    }
  }
  return (
    <>
      <ChangeReview state={watchState} isEditMode={editorState.enabled}
        editorDirty={editorState.dirty} onApply={onWatchApply} onCheck={onWatchCheck}
        onSectionNavigate={onReviewSectionNavigate} disabled={isLoading}
        renderTrigger={review => <DocumentActionToolbar
          actions={createDocumentActions({ ...actionContext, canReview: Boolean(review),
            controls: { ...actionContext.controls, review } })}
          visible={visible} openMenu={menuOpen} onMenuChange={setMenuOpen} onLayoutChange={setActionsLayout} />} />
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
