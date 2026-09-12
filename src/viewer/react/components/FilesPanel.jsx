import React from 'react'
import { ExplorerPanel } from './explorer/ExplorerPanel.jsx'

export function FilesPanel({ explorerBridge }) {
  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--files"
      id="mdp-panel-files"
    >
      <div className="mdp-explorer-container">
        <ExplorerPanel bridge={explorerBridge} />
      </div>
    </div>
  )
}
