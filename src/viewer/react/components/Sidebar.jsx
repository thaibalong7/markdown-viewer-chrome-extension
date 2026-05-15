import React, { useCallback, useState } from 'react'
import { SidebarTabs } from './SidebarTabs.jsx'
import { OutlinePanel } from './OutlinePanel.jsx'
import { FilesPanel } from './FilesPanel.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function Sidebar({
  settings,
  tocItems,
  tocReady,
  explorerBridge,
  scrollRoot,
  forceHidden,
  onTocClickInEditor
}) {
  const showToc = forceHidden !== undefined ? !forceHidden : settings?.layout?.showToc !== false
  const [sidebarEl, setSidebarEl] = useState(null)
  const [handleEl, setHandleEl] = useState(null)

  const handleSidebarRef = useCallback((node) => {
    setSidebarEl(node)
  }, [])

  const handleResizeRef = useCallback((node) => {
    setHandleEl(node)
  }, [])

  return (
    <aside className="mdp-sidebar" style={{ display: showToc ? '' : 'none' }} ref={handleSidebarRef}>
      <SidebarTabs />
      <OutlinePanel
        tocItems={tocItems}
        tocReady={tocReady}
        scrollRoot={scrollRoot}
        onTocClickInEditor={onTocClickInEditor}
      />
      <FilesPanel explorerBridge={explorerBridge} />
      <ResizeHandle
        rootEl={scrollRoot}
        sidebarEl={sidebarEl}
        handleEl={handleEl}
        setHandleEl={handleResizeRef}
        settings={settings}
      />
    </aside>
  )
}
