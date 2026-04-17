import React from 'react'
import { useViewerState } from '../contexts/ViewerStateContext.jsx'
import { ExplorerPanel } from './explorer/ExplorerPanel.jsx'

export function FilesPanel({ onPanelRef, explorerBridge }) {
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
      <div className="mdp-explorer-container">
        <ExplorerPanel bridge={explorerBridge} />
      </div>
    </div>
  )
}
