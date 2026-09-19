import React, { useCallback, useState } from 'react'
import { OutlinePanel } from './OutlinePanel.jsx'
import { PanelToggleButton } from './PanelToggleButton.jsx'
import { ResizeHandle } from './ResizeHandle.jsx'

export function RightRail({
  actions,
  outlineAvailable,
  outlineExpanded,
  onOutlineToggle,
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
      className={`mdp-right-rail${
        outlineExpanded ? ' mdp-right-rail--outline-expanded' : ' mdp-right-rail--actions-only'
      }${
        outlineAvailable && !outlineExpanded ? ' mdp-right-rail--outline-collapsed' : ''
      }`}
      aria-label={outlineAvailable ? 'Document actions and outline' : 'Document actions'}
      ref={handleRailRef}
    >
      {outlineAvailable && (
        <PanelToggleButton
          panel="outline"
          expanded={outlineExpanded}
          controls="mdp-panel-outline"
          onClick={onOutlineToggle}
        />
      )}
      <div className="mdp-right-rail__actions-row">
        <span className="mdp-right-rail__actions-label" aria-hidden="true">
          Actions
        </span>
        {actions}
      </div>
      {outlineAvailable && (
        <div
          className="mdp-right-rail__outline-clip"
          aria-hidden={outlineExpanded ? 'false' : 'true'}
        >
          <OutlinePanel
            tocItems={tocItems}
            tocReady={tocReady}
            scrollRoot={scrollRoot}
            onTocClickInEditor={onTocClickInEditor}
            onHeadingNavigate={onHeadingNavigate}
          />
        </div>
      )}
      {outlineExpanded && (
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
