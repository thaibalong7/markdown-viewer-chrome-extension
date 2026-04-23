import React, { useCallback, useEffect, useState } from 'react'
import { SidebarTabs } from './SidebarTabs.jsx'
import { OutlinePanel } from './OutlinePanel.jsx'
import { FilesPanel } from './FilesPanel.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function Sidebar({ settings, tocItems, tocReady, explorerBridge, scrollRoot }) {
  const showToc = settings?.layout?.showToc !== false
  const [sidebarEl, setSidebarEl] = useState(null)
  const [handleEl, setHandleEl] = useState(null)

  const handleSidebarRef = useCallback((node) => {
    setSidebarEl(node)
  }, [])

  const handleResizeRef = useCallback((node) => {
    setHandleEl(node)
  }, [])

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
      <SidebarTabs />
      <OutlinePanel tocItems={tocItems} tocReady={tocReady} scrollRoot={scrollRoot} />
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
