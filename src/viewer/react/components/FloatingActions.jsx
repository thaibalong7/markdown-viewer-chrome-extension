import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
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
import { SidebarToggleIcon } from './icons/SidebarToggleIcon.jsx'
import { SaveIcon } from './icons/SaveIcon.jsx'
import { FocusIcon } from './icons/FocusIcon.jsx'
import { CopyLinkIcon } from './icons/CopyLinkIcon.jsx'

export function FloatingActions({ getArticleEl, getSettings, getCurrentFileUrl, onSave }) {
  const exportBtnRef = useRef(null)
  const exportWrapRef = useRef(null)
  const { showToast } = useToast()
  const editorState = useEditorState()
  const editorDispatch = useEditorDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const currentFileUrl = getCurrentFileUrl?.() || ''
  const visible = Boolean(String(currentFileUrl).trim())
  const canCopyLink = canCopyCurrentFileLink(currentFileUrl)
  const isLocalFile = currentFileUrl.startsWith('file:')
  const documentActionsDisabled = editorState.enabled

  useEffect(() => {
    if (!visible) setMenuOpen(false)
  }, [visible])

  useEffect(() => {
    if (documentActionsDisabled) setMenuOpen(false)
  }, [documentActionsDisabled])

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
    if (documentActionsDisabled) return
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
    if (documentActionsDisabled) return
    printDocument()
  }

  const onExportToggleClick = (ev) => {
    ev.stopPropagation()
    if (documentActionsDisabled) return
    setMenuOpen((open) => !open)
  }

  const onEditClick = () => {
    setMenuOpen(false)
    if (editorState.enabled && editorState.dirty) {
      const leave = window.confirm('You have unsaved changes. Exit edit mode without saving?')
      if (!leave) return
    }
    editorDispatch({ type: 'TOGGLE_EDIT' })
  }

  const onSaveClick = () => {
    setMenuOpen(false)
    onSave?.()
  }

  const onSidebarToggleClick = () => {
    editorDispatch({ type: 'TOGGLE_SIDEBAR' })
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

  return (
    <div className="mdp-floating-actions" hidden={!visible} aria-hidden={visible ? 'false' : 'true'}>
      <IconButton
        tooltip={
          editorState.enabled
            ? 'Sidebar hidden in edit mode'
            : editorState.sidebarVisible
              ? 'Hide sidebar'
              : 'Show sidebar'
        }
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        className="mdp-fab-btn"
        activeClassName="mdp-fab-btn--active"
        aria-label="Toggle sidebar"
        pressed={editorState.sidebarVisible}
        disabled={editorState.enabled}
        onClick={onSidebarToggleClick}
      >
        <SidebarToggleIcon className="mdp-fab-btn__icon" />
      </IconButton>

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
        disabled={!canCopyLink}
        onClick={onCopyLinkClick}
      >
        <CopyLinkIcon className="mdp-fab-btn__icon" />
      </IconButton>

      {isLocalFile && (
        <IconButton
          tooltip={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className={`mdp-fab-btn${editorState.dirty ? ' mdp-fab-btn--dirty-dot' : ''}`}
          activeClassName="mdp-fab-btn--active"
          aria-label={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
          pressed={editorState.enabled}
          onClick={onEditClick}
        >
          <EditIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {isLocalFile && editorState.enabled && (
        <IconButton
          tooltip={editorState.dirty ? 'Save (Ctrl+S)' : 'Save — no unsaved changes'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
          className="mdp-fab-btn"
          aria-label="Save markdown file"
          onClick={onSaveClick}
        >
          <SaveIcon className="mdp-fab-btn__icon" />
        </IconButton>
      )}

      {isLocalFile && editorState.enabled && (
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

      <IconButton
        tooltip={
          documentActionsDisabled
            ? 'Print disabled in edit mode'
            : 'Print — Save as PDF in the dialog to export PDF.'
        }
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        className="mdp-fab-btn"
        aria-label="Print — use Save as PDF in the print dialog."
        disabled={documentActionsDisabled}
        onClick={onPrintClick}
      >
        <PrintIcon className="mdp-fab-btn__icon" />
      </IconButton>

      <ActionMenu
        ref={exportWrapRef}
        open={menuOpen}
        className="mdp-fab-export"
        triggerRef={exportBtnRef}
        triggerClassName="mdp-fab-btn mdp-fab-export__trigger"
        triggerIcon={<ExportIcon className="mdp-fab-btn__icon" />}
        triggerLabel="Download — HTML or Word (.doc)."
        triggerTooltip={
          documentActionsDisabled
            ? 'Export disabled in edit mode'
            : 'Download — HTML or Word (.doc).'
        }
        triggerShowDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        triggerDisabled={documentActionsDisabled}
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
    </div>
  )
}
