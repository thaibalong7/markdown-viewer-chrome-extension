import React from 'react'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { ViewerStateProvider } from './contexts/ViewerStateContext.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { ToolbarActions } from './components/ToolbarActions.jsx'

export function ViewerApp({
  settings,
  markdown,
  currentFileUrl,
  tocItems,
  explorerBridge,
  onShellReady,
  getArticleEl,
  getSettings,
  getCurrentFileUrl,
  onShowToastReady
}) {
  return (
    <SettingsProvider initialSettings={settings}>
      <ToastProvider onShowToastReady={onShowToastReady}>
        <ViewerStateProvider markdown={markdown} currentFileUrl={currentFileUrl}>
          <ViewerShell
            onShellReady={onShellReady}
            settings={settings}
            tocItems={tocItems}
            explorerBridge={explorerBridge}
          >
            <ToolbarActions
              getArticleEl={getArticleEl}
              getSettings={getSettings}
              getCurrentFileUrl={getCurrentFileUrl}
            />
          </ViewerShell>
        </ViewerStateProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}
