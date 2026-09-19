import React, { useCallback, useState } from 'react'
import { FilesPanel } from './FilesPanel.jsx'
import { PanelToggleButton } from './PanelToggleButton.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function Sidebar({ explorerBridge, rootEl, settings, expanded, onToggle }) {
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
      className={`mdp-sidebar mdp-sidebar--files ${
        expanded ? 'mdp-sidebar--expanded' : 'mdp-sidebar--collapsed'
      }`}
      aria-label="Files"
      ref={handleSidebarRef}
    >
      <div
        className="mdp-sidebar__panel-clip"
        aria-hidden={expanded ? 'false' : 'true'}
      >
        <FilesPanel explorerBridge={explorerBridge} />
      </div>
      <PanelToggleButton
        panel="files"
        expanded={expanded}
        controls="mdp-panel-files"
        onClick={onToggle}
      />
      {!expanded && (
        <button
          className="mdp-sidebar__collapsed-hit-area"
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={onToggle}
        />
      )}
      {expanded && (
        <ResizeHandle
          rootEl={rootEl}
          sidebarEl={sidebarEl}
          handleEl={handleEl}
          setHandleEl={handleResizeRef}
          settings={settings}
          side="left"
          panel="files"
        />
      )}
    </aside>
  )
}
