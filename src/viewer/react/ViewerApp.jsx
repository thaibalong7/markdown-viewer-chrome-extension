import React from 'react'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { ViewerStateProvider } from './contexts/ViewerStateContext.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { ToolbarActions } from './components/ToolbarActions.jsx'

export function ViewerApp({
  settings,
  markdown,
  currentFileUrl,
  onShellReady,
  getArticleEl,
  getSettings,
  getCurrentFileUrl,
  showToast
}) {
  return (
    <SettingsProvider initialSettings={settings}>
      <ViewerStateProvider markdown={markdown} currentFileUrl={currentFileUrl}>
        <ViewerShell onShellReady={onShellReady}>
          <ToolbarActions
            getArticleEl={getArticleEl}
            getSettings={getSettings}
            getCurrentFileUrl={getCurrentFileUrl}
            showToast={showToast}
          />
        </ViewerShell>
      </ViewerStateProvider>
    </SettingsProvider>
  )
}
