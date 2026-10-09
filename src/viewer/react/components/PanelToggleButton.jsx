import React, { useEffect, useState } from 'react'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { IconButton } from './common/IconButton.jsx'

export function PanelToggleButton({ panel, expanded, controls, onClick, buttonRef }) {
  const [switching, setSwitching] = useState(0)
  useEffect(() => {
    if (!switching) return undefined
    const timer = setTimeout(() => setSwitching(0), 600)
    return () => clearTimeout(timer)
  }, [switching])
  const isFiles = panel === 'files'
  const panelLabel = isFiles ? 'Files' : 'Outline'
  const direction = isFiles
    ? (expanded ? 'left' : 'right')
    : (expanded ? 'right' : 'left')
  const label = `${expanded ? 'Hide' : 'Show'} ${panelLabel} panel`

  return (
    <IconButton
      ref={buttonRef}
      tooltip={label}
      showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      pointerPlacement
      className={`mdp-panel-toggle mdp-panel-toggle--${panel}${switching ? ' is-switching' : ''}`}
      style={{ '--mdp-toggle-direction': direction === 'left' ? -1 : 1 }}
      aria-label={label}
      aria-controls={controls}
      aria-expanded={expanded ? 'true' : 'false'}
      onClick={event => { setSwitching(value => value + 1); onClick?.(event) }}
    >
      <span className="mdp-panel-toggle__face" aria-hidden="true">
        <span className="mdp-panel-toggle__skin" />
        <span className="mdp-panel-toggle__mark" />
        <span key={switching} className="mdp-panel-toggle__sweep" />
        <AppIcon name={`sidebar-chevron-${direction}`} viewBox="3 0 18 24"
          strokeWidth="2.25" className="mdp-panel-toggle__chevron" />
      </span>
    </IconButton>
  )
}
