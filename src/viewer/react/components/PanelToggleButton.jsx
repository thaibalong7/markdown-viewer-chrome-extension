import React from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { IconButton } from './common/IconButton.jsx'

function ChevronGlyph({ direction }) {
  const path = direction === 'left' ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5'
  return (
    <svg
      className="mdp-panel-toggle__chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

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
      <ChevronGlyph direction={direction} />
    </IconButton>
  )
}
