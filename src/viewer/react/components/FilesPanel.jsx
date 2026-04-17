import React from 'react'
import { useSidebarTabState } from '../contexts/SidebarTabContext.jsx'
import { ExplorerPanel } from './explorer/ExplorerPanel.jsx'

export function FilesPanel({ explorerBridge }) {
  const { activeSidebarTab } = useSidebarTabState()
  const isFiles = activeSidebarTab === 'files'

  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--files"
      role="tabpanel"
      id="mdp-panel-files"
      aria-labelledby="mdp-tab-files"
      hidden={!isFiles}
    >
      <div className="mdp-explorer-container">
        <ExplorerPanel bridge={explorerBridge} />
      </div>
    </div>
  )
}
