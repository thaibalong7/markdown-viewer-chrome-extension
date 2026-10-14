import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

/** Both decorative layers stay mounted; the control owns its label and focus. */
export function IconSwap({ name, alternate = 'check', swapped = false, size = 18, className = '', style, ...iconProps }) {
  return <span className={`mdp-icon-swap${className ? ` ${className}` : ''}`} data-swapped={swapped}
    aria-hidden="true" style={{ width: size, height: size, ...style }}>
    <AppIcon name={name} size={size} {...iconProps} data-icon-visible={!swapped} className="mdp-icon-swap__from" />
    <AppIcon name={alternate} size={size} {...iconProps} data-icon-visible={swapped} className="mdp-icon-swap__to" />
  </span>
}
