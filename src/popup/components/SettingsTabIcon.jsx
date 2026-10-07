import React from 'react'
import { AppIcon } from '../../shared/react/AppIcon.jsx'

const TAB_ICONS = { history: 'history', reader: 'reader', editor: 'editor', plugins: 'plugins' }

export function SettingsTabIcon({ name }) {
  return <AppIcon name={TAB_ICONS[name] || 'history'} />
}
