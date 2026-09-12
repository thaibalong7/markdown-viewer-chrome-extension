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
  useSidebarResize({ rootEl, sidebarEl, handleEl, settings, side, panel })

  const isRight = side === 'right'
  const panelLabel = panel === 'files' ? 'Files panel' : 'Outline'

  return (
    <Tooltip
      pointerPlacement
      content={`Drag to resize ${panelLabel}. When focused, use Left/Right Arrow keys (16px per step).`}
    >
      <div
        className={`mdp-sidebar__resize-handle${isRight ? ' mdp-sidebar__resize-handle--right' : ''}`}
        role="separator"
        aria-label={`Resize ${panelLabel}`}
        aria-orientation="vertical"
        aria-valuemin="220"
        aria-valuemax="520"
        tabIndex={0}
        ref={setHandleEl}
      />
    </Tooltip>
  )
}
