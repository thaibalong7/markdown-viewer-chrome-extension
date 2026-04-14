import React from 'react'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { ViewerStateProvider } from './contexts/ViewerStateContext.jsx'

export function ViewerApp({ settings, markdown, currentFileUrl }) {
  return (
    <SettingsProvider initialSettings={settings}>
      <ViewerStateProvider markdown={markdown} currentFileUrl={currentFileUrl}>
        <div className="mdp-react-root" data-testid="mdp-react-root" />
      </ViewerStateProvider>
    </SettingsProvider>
  )
}
