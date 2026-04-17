import React, { useCallback, useEffect, useState } from 'react'
import { SidebarTabs } from './SidebarTabs.jsx'
import { OutlinePanel } from './OutlinePanel.jsx'
import { FilesPanel } from './FilesPanel.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function Sidebar({
  settings,
  tocItems,
  explorerBridge,
  scrollRoot,
  onSidebarRef,
  onTabBarRef,
  onTabFilesRef,
  onTabOutlineRef,
  onFilesPanelRef,
  onOutlinePanelRef,
  onTocContainerRef,
  onResizeHandleRef
}) {
  const showToc = settings?.layout?.showToc !== false
  const [sidebarEl, setSidebarEl] = useState(null)
  const [handleEl, setHandleEl] = useState(null)

  const handleSidebarRef = useCallback(
    (node) => {
      setSidebarEl(node)
      onSidebarRef?.(node)
    },
    [onSidebarRef]
  )

  const handleResizeRef = useCallback(
    (node) => {
      setHandleEl(node)
      onResizeHandleRef?.(node)
    },
    [onResizeHandleRef]
  )

  useEffect(() => {
    if (!sidebarEl) return undefined
    const body = sidebarEl.parentElement
    if (body?.classList?.contains('mdp-body')) {
      body.classList.toggle('mdp-body--no-toc', !showToc)
    }
    return () => {
      if (body?.classList?.contains('mdp-body')) {
        body.classList.remove('mdp-body--no-toc')
      }
    }
  }, [showToc, sidebarEl])

  return (
    <aside className="mdp-sidebar" style={{ display: showToc ? '' : 'none' }} ref={handleSidebarRef}>
      <SidebarTabs
        onTabBarRef={onTabBarRef}
        onTabFilesRef={onTabFilesRef}
        onTabOutlineRef={onTabOutlineRef}
      />
      <OutlinePanel
        onPanelRef={onOutlinePanelRef}
        onTocContainerRef={onTocContainerRef}
        tocItems={tocItems}
        scrollRoot={scrollRoot}
      />
      <FilesPanel onPanelRef={onFilesPanelRef} explorerBridge={explorerBridge} />
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
