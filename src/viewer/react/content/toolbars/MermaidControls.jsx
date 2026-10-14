import React from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { Tooltip } from '../../components/Tooltip.jsx'
import { useContentCopy } from './useContentCopy.js'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../../shared/constants/tooltip.js'

export function MermaidCopyControl({ source, copyAction }) {
  const { copied, busy, copy } = useContentCopy(copyAction, () => source)
  return (
    <Tooltip content="Copy Mermaid source" showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS} suppressed={busy || copied}>
      <button
        type="button"
        data-mdp-react-control=""
        className={`mdp-mermaid-toolbar__copy${copied ? ' is-copied' : ''}`}
        aria-label={copied ? 'Copied' : 'Copy Mermaid source'}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={copy}
      >
        <AppIcon name="copy" size={14} />
      </button>
    </Tooltip>
  )
}

export function MermaidExpandControl({ onOpen }) {
  const open = event => {
    event.preventDefault()
    event.stopPropagation()
    onOpen()
  }
  return (
    <Tooltip content="Open chart in full-screen zoom view." showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}>
      <button
        type="button"
        className="mdp-mermaid-toolbar__expand"
        aria-label="Open Mermaid chart in zoom view"
        onClick={open}
      >
        <AppIcon name="expand" size={16} />
      </button>
    </Tooltip>
  )
}

export function MermaidActions({
  open, portalTarget, rootRef, triggerRef, menuRef,
  onToggle, onAction, onKeyDown, menuId
}) {
  const menu = (
    <div
      ref={menuRef}
      id={menuId}
      className="mdp-mermaid-actions__menu"
      hidden={!open}
      role="menu"
      aria-label="Export Mermaid chart"
      onClick={onAction}
      onKeyDown={onKeyDown}
    >
      <button type="button" role="menuitem" className="mdp-mermaid-actions__item" data-action="export-svg">
        Download SVG
      </button>
      <div className="mdp-mermaid-actions__separator" role="separator" />
      <div className="mdp-mermaid-actions__group-label">Download PNG</div>
      {[1, 2, 3, 4].map(scale => (
        <button
          key={scale}
          type="button"
          role="menuitem"
          className="mdp-mermaid-actions__item"
          data-action="export-png"
          data-scale={scale}
        >
          PNG {scale}x
        </button>
      ))}
    </div>
  )
  return (
    <div ref={rootRef} className="mdp-mermaid-actions">
      <Tooltip
        content="Export this diagram: SVG (vector) or PNG at 1x–4x resolution."
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        suppressed={open}
      >
        <button
          ref={triggerRef}
          type="button"
          className="mdp-mermaid-actions__trigger"
          aria-label="Mermaid chart actions"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={onToggle}
        >
          <AppIcon name="more" size={14} />
        </button>
      </Tooltip>
      {createPortal(menu, portalTarget)}
    </div>
  )
}
