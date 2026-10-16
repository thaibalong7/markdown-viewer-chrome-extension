import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { IconSwap } from '../../components/common/IconSwap.jsx'
import { Tooltip } from '../../components/Tooltip.jsx'
import { useContentCopy } from './useContentCopy.js'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../../shared/constants/tooltip.js'

export function MermaidCopyControl({ source, copyAction }) {
  useLocale()
  const { copied, busy, copy } = useContentCopy(copyAction, () => source)
  return (
    <Tooltip content={t('viewer.mermaid.copyMermaidSource')} showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS} suppressed={busy || copied}>
      <button
        type="button"
        data-mdp-react-control=""
        className={`mdp-mermaid-toolbar__copy${copied ? ' is-copied' : ''}`}
        aria-label={copied ? t('common.status.copied') : t('viewer.mermaid.copyMermaidSource')}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={copy}
      >
        <IconSwap name="copy" size={16} swapped={copied} />
      </button>
    </Tooltip>
  )
}

export function MermaidExpandControl({ onOpen }) {
  useLocale()
  const open = event => {
    event.preventDefault()
    event.stopPropagation()
    onOpen()
  }
  return (
    <Tooltip content={t('viewer.mermaid.openChartInFullScreenZoomView')} showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}>
      <button
        type="button"
        className="mdp-mermaid-toolbar__expand"
        aria-label={t('viewer.media.openMermaidChartInZoomView')}
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
  useLocale()
  const menu = (
    <div
      ref={menuRef}
      id={menuId}
      className="mdp-mermaid-actions__menu"
      hidden={!open}
      role="menu"
      aria-label={t('viewer.mermaid.exportMermaidChart')}
      onClick={onAction}
      onKeyDown={onKeyDown}
    >
      <button type="button" role="menuitem" className="mdp-mermaid-actions__item" data-action="export-svg">{t('viewer.mermaid.downloadSVG')}</button>
      <div className="mdp-mermaid-actions__separator" role="separator" />
      <div className="mdp-mermaid-actions__group-label">{t('viewer.mermaid.downloadPNG')}</div>
      {[1, 2, 3, 4].map(scale => (
        <button
          key={scale}
          type="button"
          role="menuitem"
          className="mdp-mermaid-actions__item"
          data-action="export-png"
          data-scale={scale}
        >{t('viewer.mermaid.png')}{' '}{scale}{t('plugins.taskList.x')}</button>
      ))}
    </div>
  )
  return (
    <div ref={rootRef} className="mdp-mermaid-actions">
      <Tooltip
        content={t('viewer.mermaid.exportThisDiagramSVGVectorOrPNGAt')}
        showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
        suppressed={open}
      >
        <button
          ref={triggerRef}
          type="button"
          className="mdp-mermaid-actions__trigger"
          aria-label={t('viewer.mermaid.mermaidChartActions')}
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
