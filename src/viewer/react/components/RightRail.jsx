import React, { useCallback, useState } from 'react'
import { OutlinePanel } from './OutlinePanel.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function RightRail({
  actions,
  outlineVisible,
  settings,
  tocItems,
  tocReady,
  scrollRoot,
  onTocClickInEditor,
  onHeadingNavigate
}) {
  const [railEl, setRailEl] = useState(null)
  const [handleEl, setHandleEl] = useState(null)

  const handleRailRef = useCallback((node) => {
    setRailEl(node)
  }, [])

  const handleResizeRef = useCallback((node) => {
    setHandleEl(node)
  }, [])

  return (
    <aside
      className={`mdp-right-rail${outlineVisible ? '' : ' mdp-right-rail--actions-only'}`}
      aria-label={outlineVisible ? 'Document actions and outline' : 'Document actions'}
      ref={handleRailRef}
    >
      {actions}
      {outlineVisible && (
        <OutlinePanel
          tocItems={tocItems}
          tocReady={tocReady}
          scrollRoot={scrollRoot}
          onTocClickInEditor={onTocClickInEditor}
          onHeadingNavigate={onHeadingNavigate}
        />
      )}
      {outlineVisible && (
        <ResizeHandle
          rootEl={scrollRoot}
          sidebarEl={railEl}
          handleEl={handleEl}
          setHandleEl={handleResizeRef}
          settings={settings}
          side="right"
          panel="outline"
        />
      )}
    </aside>
  )
}
