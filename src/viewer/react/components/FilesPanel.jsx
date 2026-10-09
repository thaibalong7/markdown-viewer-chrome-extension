import React from 'react'
import { ExplorerPanel } from './explorer/ExplorerPanel.jsx'

export function FilesPanel({ explorerBridge, expanded, scrollbarVisibility }) {
  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--files"
      id="mdp-panel-files"
    >
      <ExplorerPanel bridge={explorerBridge} expanded={expanded} scrollbarVisibility={scrollbarVisibility} />
    </div>
  )
}
