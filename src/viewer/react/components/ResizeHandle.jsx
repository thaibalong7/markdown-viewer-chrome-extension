import React from 'react'
import { useSidebarResize } from '../hooks/useSidebarResize.js'
import { Tooltip } from './Tooltip.jsx'

export function ResizeHandle({ rootEl, sidebarEl, handleEl, setHandleEl, settings }) {
  useSidebarResize({ rootEl, sidebarEl, handleEl, settings })

  return (
    <Tooltip
      pointerPlacement
      content="Drag to resize the sidebar. When focused, use Left/Right Arrow keys (16px per step)."
    >
      <div
        className="mdp-sidebar__resize-handle"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin="220"
        aria-valuemax="520"
        tabIndex={0}
        ref={setHandleEl}
      />
    </Tooltip>
  )
}
