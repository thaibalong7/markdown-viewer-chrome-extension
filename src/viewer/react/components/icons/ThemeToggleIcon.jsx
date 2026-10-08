import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

export function ThemeToggleIcon({ className = '', targetPreset }) {
  const dark = targetPreset === 'dark'
  return <AppIcon name={dark ? 'moon' : 'sun'}
    className={`${className} mdp-fab-btn__theme-icon mdp-fab-btn__theme-icon--${dark ? 'dark' : 'light'}`.trim()} />
}
