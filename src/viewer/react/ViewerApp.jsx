import React from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { SidebarTabProvider } from './contexts/SidebarTabContext.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { FloatingActions } from './components/FloatingActions.jsx'

export function ViewerApp({
  settings,
  tocItems,
  tocReady,
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
          tocReady={tocReady}
          explorerBridge={explorerBridge}
        >
          <FloatingActions
            getArticleEl={getArticleEl}
            getSettings={getSettings}
            getCurrentFileUrl={getCurrentFileUrl}
          />
        </ViewerShell>
      </SidebarTabProvider>
    </ToastProvider>
  )
}
