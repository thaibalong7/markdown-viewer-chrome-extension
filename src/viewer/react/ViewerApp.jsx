import React from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { SidebarTabProvider } from './contexts/SidebarTabContext.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { ToolbarActions } from './components/ToolbarActions.jsx'

export function ViewerApp({
  settings,
  tocItems,
  explorerBridge,
  onShellReady,
  getArticleEl,
  getSettings,
  getCurrentFileUrl,
  onShowToastReady
}) {
  return (
    <ToastProvider onShowToastReady={onShowToastReady}>
      <SidebarTabProvider>
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
      </SidebarTabProvider>
    </ToastProvider>
  )
}
