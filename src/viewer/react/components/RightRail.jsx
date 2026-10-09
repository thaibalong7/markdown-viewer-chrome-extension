import React, { useLayoutEffect, useRef, useState } from 'react'
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
  const [compactHeader, setCompactHeader] = useState(false)
  const expandedWidth = useRef(null)
  useLayoutEffect(() => {
    if (!railEl) return undefined
    const view = railEl.ownerDocument.defaultView
    const measure = () => {
      if (outlineExpanded) expandedWidth.current = railEl.getBoundingClientRect().width
      const savedWidth = parseFloat(view.getComputedStyle(railEl).getPropertyValue('--mdp-toc-width')) || 280
      const width = expandedWidth.current ?? (view.innerWidth >= 1024 && view.innerWidth < 1280 ? Math.min(savedWidth, 224) : savedWidth)
      setCompactHeader(width <= 280)
    }
    const observer = view.ResizeObserver ? new view.ResizeObserver(measure) : null
    observer?.observe(railEl)
    measure()
    return () => observer?.disconnect()
  }, [outlineExpanded, railEl])
  const toggleRef = useRef(null)
  const restoreToggleFocus = useRef(false)
  const outlineScroll = useRef(0)
  const toggleOutline = () => {
    if (outlineExpanded) outlineScroll.current = railEl?.querySelector('.mdp-toc')?.scrollTop || 0
    restoreToggleFocus.current = true
    onOutlineToggle?.()
  }
  useLayoutEffect(() => {
    if (!restoreToggleFocus.current) return undefined
    restoreToggleFocus.current = false
    toggleRef.current?.focus?.({ preventScroll: true })
    if (!outlineExpanded) return undefined
    const frame = requestAnimationFrame(() => {
      const toc = railEl?.querySelector('.mdp-toc')
      if (toc) toc.scrollTop = outlineScroll.current
    })
    return () => cancelAnimationFrame(frame)
  }, [outlineExpanded, railEl])
  return (
    <aside
      className={`mdp-right-rail${
        outlineExpanded ? ' mdp-right-rail--outline-expanded' : ' mdp-right-rail--actions-only'
      }${
        outlineAvailable && !outlineExpanded ? ' mdp-right-rail--outline-collapsed' : ''
      }`}
      data-compact-header={compactHeader ? 'true' : undefined}
      aria-label={outlineAvailable ? 'Document actions and outline' : 'Document actions'}
      ref={setRailEl}
    >
      {outlineAvailable && (
        <PanelToggleButton panel="outline" expanded={outlineExpanded}
          controls="mdp-panel-outline" onClick={toggleOutline} buttonRef={toggleRef} />
      )}
      <div className="mdp-right-rail__actions-row">
        <div className="mdp-right-rail__commands">{actions}</div>
        {outlineExpanded && <strong className="mdp-right-rail__title">Outline</strong>}
      </div>
      {outlineAvailable && (
        <div
          className="mdp-right-rail__outline-clip"
          aria-hidden={outlineExpanded ? 'false' : 'true'}
          inert={!outlineExpanded}
        >
          <OutlinePanel
            expanded={outlineExpanded}
            scrollbarVisibility={settings?.appearance?.scrollbarVisibility}
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
          setHandleEl={setHandleEl}
          settings={settings}
          side="right"
          panel="outline"
        />
      )}
    </aside>
  )
}
