import React, { useEffect, useMemo, useRef, useState } from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../../../shared/constants/viewer.js'
import {
  buildExportFilename,
  exportAsHtml,
  exportAsWord,
  printDocument
} from '../../actions/document-actions.js'
import { copyCurrentFileLink } from '../../actions/file-link-actions.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { useEditorState, useEditorDispatch } from '../contexts/EditorContext.jsx'
import { Tooltip } from './Tooltip.jsx'
import { ExportIcon } from './icons/ExportIcon.jsx'
import { PrintIcon } from './icons/PrintIcon.jsx'
import { EditIcon } from './icons/EditIcon.jsx'
import { SidebarToggleIcon } from './icons/SidebarToggleIcon.jsx'
import { SaveIcon } from './icons/SaveIcon.jsx'
import { FocusIcon } from './icons/FocusIcon.jsx'
import { CopyLinkIcon } from './icons/CopyLinkIcon.jsx'

export function FloatingActions({ getArticleEl, getSettings, getCurrentFileUrl, onSave }) {
  const printBtnRef = useRef(null)
  const exportBtnRef = useRef(null)
  const exportWrapRef = useRef(null)
  const copyFeedbackTimerRef = useRef(0)
  const { showToast } = useToast()
  const editorState = useEditorState()
  const editorDispatch = useEditorDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copyLinkCopied, setCopyLinkCopied] = useState(false)
  const currentFileUrl = getCurrentFileUrl?.() || ''
  const visible = Boolean(String(currentFileUrl).trim())
  const isLocalFile = currentFileUrl.startsWith('file:')

  const flashCopyLinkCopied = () => {
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = 0
    }
    setCopyLinkCopied(true)
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      copyFeedbackTimerRef.current = 0
      setCopyLinkCopied(false)
    }, COPY_BUTTON_FEEDBACK_MS)
  }

  useEffect(() => {
    if (!menuOpen) return undefined
    const doc = document

    const onDocPointerDown = (ev) => {
      const exportWrap = exportWrapRef.current
      if (!exportWrap) return
      const path = typeof ev.composedPath === 'function' ? ev.composedPath() : null
      if (path ? !path.includes(exportWrap) : !exportWrap.contains(ev.target)) {
        setMenuOpen(false)
      }
    }

    const onKeyDown = (ev) => {
      if (ev.key !== 'Escape') return
      ev.preventDefault()
      setMenuOpen(false)
      exportBtnRef.current?.focus()
    }

    doc.addEventListener('pointerdown', onDocPointerDown, true)
    doc.addEventListener('keydown', onKeyDown, true)

    return () => {
      doc.removeEventListener('pointerdown', onDocPointerDown, true)
      doc.removeEventListener('keydown', onKeyDown, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!visible) setMenuOpen(false)
  }, [visible])

  useEffect(
    () => () => {
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current)
      }
    },
    []
  )

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

  const runExport = (ext, exportFn, errorMsg) => {
    void (async () => {
      const article = getArticleEl?.()
      if (!article) {
        showToast?.('Nothing to export yet.')
        return
      }
      const filename = buildExportFilename(getCurrentFileUrl?.(), ext)
      try {
        await exportFn(article, getSettings?.(), filename)
        showToast?.(`Exported ${filename}`)
      } catch {
        showToast?.(errorMsg)
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
        showToast?.('Copied file link')
      } catch {
        showToast?.('Could not copy file link')
      }
    })()
  }

  const onFocusToggleClick = () => {
    setMenuOpen(false)
    editorDispatch({ type: 'TOGGLE_FOCUS' })
  }

  return (
    <div className="mdp-floating-actions" hidden={!visible} aria-hidden={visible ? 'false' : 'true'}>
      <Tooltip
        content={
          editorState.enabled && editorState.mode === 'focus'
            ? 'Sidebar hidden in focus mode'
            : editorState.sidebarVisible
              ? 'Hide sidebar'
              : 'Show sidebar'
        }
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      >
        <button
          type="button"
          className={`mdp-fab-btn${editorState.sidebarVisible ? ' mdp-fab-btn--active' : ''}`}
          aria-label="Toggle sidebar"
          aria-pressed={editorState.sidebarVisible ? 'true' : 'false'}
          disabled={editorState.enabled && editorState.mode === 'focus'}
          onClick={onSidebarToggleClick}
        >
          <SidebarToggleIcon className="mdp-fab-btn__icon" />
        </button>
      </Tooltip>

      <Tooltip
        content={copyLinkCopied ? 'Copied' : 'Copy open file link'}
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      >
        <button
          type="button"
          className={`mdp-fab-btn mdp-fab-btn--copy-link${copyLinkCopied ? ' is-copied' : ''}`}
          aria-label={copyLinkCopied ? 'Copied' : 'Copy open file link'}
          onClick={onCopyLinkClick}
        >
          <CopyLinkIcon className="mdp-fab-btn__icon" />
        </button>
      </Tooltip>

      {isLocalFile && (
        <Tooltip
          content={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        >
          <button
            type="button"
            className={`mdp-fab-btn${editorState.enabled ? ' mdp-fab-btn--active' : ''}${
              editorState.dirty ? ' mdp-fab-btn--dirty-dot' : ''
            }`}
            aria-label={editorState.enabled ? 'Exit edit mode' : 'Edit markdown'}
            aria-pressed={editorState.enabled ? 'true' : 'false'}
            onClick={onEditClick}
          >
            <EditIcon className="mdp-fab-btn__icon" />
          </button>
        </Tooltip>
      )}

      {isLocalFile && editorState.enabled && (
        <Tooltip
          content={editorState.dirty ? 'Save (Ctrl+S)' : 'Save — no unsaved changes'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        >
          <button
            type="button"
            className="mdp-fab-btn"
            aria-label="Save markdown file"
            onClick={onSaveClick}
          >
            <SaveIcon className="mdp-fab-btn__icon" />
          </button>
        </Tooltip>
      )}

      {isLocalFile && editorState.enabled && (
        <Tooltip
          content={editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode — hide preview'}
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        >
          <button
            type="button"
            className={`mdp-fab-btn${editorState.mode === 'focus' ? ' mdp-fab-btn--active' : ''}`}
            aria-label={editorState.mode === 'focus' ? 'Exit focus mode' : 'Focus mode'}
            aria-pressed={editorState.mode === 'focus' ? 'true' : 'false'}
            onClick={onFocusToggleClick}
          >
            <FocusIcon className="mdp-fab-btn__icon" />
          </button>
        </Tooltip>
      )}

      <Tooltip
        content="Print — Save as PDF in the dialog to export PDF."
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      >
        <button
          type="button"
          className="mdp-fab-btn"
          aria-label="Print — use Save as PDF in the print dialog."
          onClick={onPrintClick}
          ref={printBtnRef}
        >
          <PrintIcon className="mdp-fab-btn__icon" />
        </button>
      </Tooltip>

      <div className="mdp-fab-export" ref={exportWrapRef}>
        <Tooltip content="Download — HTML or Word (.doc)." showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}>
          <button
            type="button"
            className="mdp-fab-btn mdp-fab-export__trigger"
            aria-label="Download — HTML or Word (.doc)."
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-haspopup="true"
            onClick={onExportToggleClick}
            ref={exportBtnRef}
          >
            <ExportIcon className="mdp-fab-btn__icon" />
          </button>
        </Tooltip>

        <div className="mdp-fab-export__menu" hidden={!menuOpen} role="menu" aria-label="Export format">
          {menuItems.map((item) => (
            <button
              key={item.ext}
              type="button"
              className="mdp-fab-export__menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                runExport(item.ext, item.exportFn, item.errorMsg)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
