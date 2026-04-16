import React, { useEffect, useMemo, useRef, useState } from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../tooltip.js'
import {
  buildExportFilename,
  exportAsHtml,
  exportAsWord,
  printDocument
} from '../../actions/document-actions.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { Tooltip } from './Tooltip.jsx'
import { ExportIcon } from './icons/ExportIcon.jsx'
import { PrintIcon } from './icons/PrintIcon.jsx'

export function ToolbarActions({ getArticleEl, getSettings, getCurrentFileUrl }) {
  const printBtnRef = useRef(null)
  const exportBtnRef = useRef(null)
  const exportWrapRef = useRef(null)
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const currentFileUrl = getCurrentFileUrl?.() || ''
  const visible = Boolean(String(currentFileUrl).trim())

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

  return (
    <div className="mdp-toolbar-doc-actions" hidden={!visible} aria-hidden={visible ? 'false' : 'true'}>
      <Tooltip
        content="Print — Save as PDF in the dialog to export PDF."
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      >
        <button
          type="button"
          className="mdp-toolbar-icon-btn"
          aria-label="Print — use Save as PDF in the print dialog."
          onClick={onPrintClick}
          ref={printBtnRef}
        >
          <PrintIcon className="mdp-toolbar-icon-btn__icon" />
        </button>
      </Tooltip>

      <div className="mdp-toolbar-export" ref={exportWrapRef}>
        <Tooltip
          content="Download — HTML or Word (.doc)."
          showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        >
          <button
            type="button"
            className="mdp-toolbar-icon-btn mdp-toolbar-export__trigger"
            aria-label="Download — HTML or Word (.doc)."
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-haspopup="true"
            onClick={onExportToggleClick}
            ref={exportBtnRef}
          >
            <ExportIcon className="mdp-toolbar-icon-btn__icon" />
          </button>
        </Tooltip>

        <div
          className="mdp-toolbar-export__menu"
          hidden={!menuOpen}
          role="menu"
          aria-label="Export format"
        >
          {menuItems.map((item) => (
            <button
              key={item.ext}
              type="button"
              className="mdp-toolbar-export__menu-item"
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
