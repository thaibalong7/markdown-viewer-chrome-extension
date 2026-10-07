import React from 'react'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { IconButton } from './common/IconButton.jsx'

export function PanelToggleButton({ panel, expanded, controls, onClick }) {
  const isFiles = panel === 'files'
  const panelLabel = isFiles ? 'Files' : 'Outline'
  const direction = isFiles
    ? (expanded ? 'left' : 'right')
    : (expanded ? 'right' : 'left')
  const label = `${expanded ? 'Hide' : 'Show'} ${panelLabel} panel`

  return (
    <IconButton
      tooltip={label}
      showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      pointerPlacement
      className={`mdp-panel-toggle mdp-panel-toggle--${panel}`}
      aria-label={label}
      aria-controls={controls}
      aria-expanded={expanded ? 'true' : 'false'}
      onClick={onClick}
    >
      <AppIcon name={`chevron-${direction}`} className="mdp-panel-toggle__chevron" />
    </IconButton>
  )
}
