import React, { useEffect } from 'react'
import { attachTooltip } from '../../tooltip.js'
import { useSidebarResize } from '../hooks/useSidebarResize.js'

export function ResizeHandle({ rootEl, sidebarEl, handleEl, setHandleEl, settings }) {
  useSidebarResize({ rootEl, sidebarEl, handleEl, settings })

  useEffect(() => {
    if (!handleEl) return undefined
    const tooltip = attachTooltip(handleEl, {
      text: 'Drag to resize the sidebar. When focused, use Left/Right Arrow keys (16px per step).'
    })
    return () => tooltip.destroy()
  }, [handleEl])

  return (
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
  )
}
