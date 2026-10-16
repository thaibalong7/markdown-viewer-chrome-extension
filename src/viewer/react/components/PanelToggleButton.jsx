import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useEffect, useState } from 'react'
import { IconSwap } from './common/IconSwap.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { IconButton } from './common/IconButton.jsx'

export function PanelToggleButton({ panel, expanded, controls, onClick, buttonRef }) {
  useLocale()
  const [switching, setSwitching] = useState(0)
  useEffect(() => {
    if (!switching) return undefined
    const timer = setTimeout(() => setSwitching(0), 600)
    return () => clearTimeout(timer)
  }, [switching])
  const isFiles = panel === 'files'
  const direction = isFiles
    ? (expanded ? 'left' : 'right')
    : (expanded ? 'right' : 'left')
  const label = isFiles
    ? expanded ? 'viewer.explorer.hide' : 'viewer.explorer.show'
    : expanded ? 'viewer.outline.hide' : 'viewer.outline.show'

  return (
    <IconButton
      ref={buttonRef}
      tooltip={t(label)}
      showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      pointerPlacement
      className={`mdp-panel-toggle mdp-panel-toggle--${panel}${switching ? ' is-switching' : ''}`}
      style={{ '--mdp-toggle-direction': direction === 'left' ? -1 : 1 }}
      aria-label={t(label)}
      aria-controls={controls}
      aria-expanded={expanded ? 'true' : 'false'}
      onClick={event => { setSwitching(value => value + 1); onClick?.(event) }}
    >
      <span className="mdp-panel-toggle__face" aria-hidden="true">
        <span className="mdp-panel-toggle__skin" />
        <span className="mdp-panel-toggle__mark" />
        <span key={switching} className="mdp-panel-toggle__sweep" />
        <IconSwap name="sidebar-chevron-left" alternate="sidebar-chevron-right" swapped={direction === 'right'}
          size={12} style={{ height: 16 }} viewBox="3 0 18 24" strokeWidth="2.25" className="mdp-panel-toggle__chevron" />
      </span>
    </IconButton>
  )
}
