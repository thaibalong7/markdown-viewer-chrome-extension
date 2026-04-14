import React from 'react'
import { useViewerState } from '../contexts/ViewerStateContext.jsx'

export function FilesPanel({ onPanelRef, onExplorerContainerRef }) {
  const { activeSidebarTab } = useViewerState()
  const isFiles = activeSidebarTab === 'files'

  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--files"
      role="tabpanel"
      id="mdp-panel-files"
      aria-labelledby="mdp-tab-files"
      hidden={!isFiles}
      ref={onPanelRef}
    >
      <div className="mdp-explorer-container" ref={onExplorerContainerRef} />
    </div>
  )
}
