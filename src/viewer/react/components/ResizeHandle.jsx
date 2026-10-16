import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React from 'react'
import { useSidebarResize } from '../hooks/useSidebarResize.js'
import { Tooltip } from './Tooltip.jsx'

export function ResizeHandle({
  rootEl,
  sidebarEl,
  handleEl,
  setHandleEl,
  settings,
  side = 'left',
  panel = 'outline'
}) {
  useLocale()
  useSidebarResize({ rootEl, sidebarEl, handleEl, settings, side, panel })

  const isRight = side === 'right'
  const panelLabel = panel === 'files' ? 'viewer.explorer.panelLabel' : 'viewer.outline.title'

  return (
    <Tooltip
      pointerPlacement
      content={t('viewer.layout.resizeHandle.dragToResizeValueWhenFocusedUseLeft', { 0: t(panelLabel) })}
    >
      <div
        className={`mdp-sidebar__resize-handle${isRight ? ' mdp-sidebar__resize-handle--right' : ''}`}
        role="separator"
        aria-label={t('viewer.layout.resizeHandle.resizeValue', { 0: t(panelLabel) })}
        aria-orientation="vertical"
        aria-valuemin="220"
        aria-valuemax="520"
        tabIndex={0}
        ref={setHandleEl}
      />
    </Tooltip>
  )
}
