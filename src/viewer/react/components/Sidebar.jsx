import React, { useCallback, useState } from 'react'
import { FilesPanel } from './FilesPanel.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function Sidebar({ explorerBridge, rootEl, settings }) {
  const [sidebarEl, setSidebarEl] = useState(null)
  const [handleEl, setHandleEl] = useState(null)

  const handleSidebarRef = useCallback((node) => {
    setSidebarEl(node)
  }, [])

  const handleResizeRef = useCallback((node) => {
    setHandleEl(node)
  }, [])

  return (
    <aside
      className="mdp-sidebar mdp-sidebar--files"
      aria-label="Files"
      ref={handleSidebarRef}
    >
      <FilesPanel explorerBridge={explorerBridge} />
      <ResizeHandle
        rootEl={rootEl}
        sidebarEl={sidebarEl}
        handleEl={handleEl}
        setHandleEl={handleResizeRef}
        settings={settings}
        side="left"
        panel="files"
      />
    </aside>
  )
}
