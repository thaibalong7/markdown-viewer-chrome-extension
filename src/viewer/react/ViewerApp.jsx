import React from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { EditorProvider } from './contexts/EditorContext.jsx'
import { DirtySync } from './components/DirtySync.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { FloatingActions } from './components/FloatingActions.jsx'

export function ViewerApp({
  settings,
  tocItems,
  tocReady,
  explorerBridge,
  markdown,
  onShellReady,
  getArticleEl,
  getSettings,
  getCurrentFileUrl,
  onShowToastReady,
  onContentChange,
  onEditorReady,
  onEditorDestroy,
  onEditorScroll,
  onTocClickInEditor,
  onEditModeChange,
  onSave,
  dirty = false,
  saveStatus = 'saved'
}) {
  return (
    <ToastProvider onShowToastReady={onShowToastReady}>
      <EditorProvider initialSidebarVisible>
        <DirtySync dirty={dirty} />
        <ViewerShell
          onShellReady={onShellReady}
          settings={settings}
          tocItems={tocItems}
          tocReady={tocReady}
          explorerBridge={explorerBridge}
          markdown={markdown}
          onContentChange={onContentChange}
          onEditorReady={onEditorReady}
          onEditorDestroy={onEditorDestroy}
          onEditorScroll={onEditorScroll}
          onTocClickInEditor={onTocClickInEditor}
          onEditModeChange={onEditModeChange}
          onSave={onSave}
          saveStatus={saveStatus}
        >
          <FloatingActions
            getArticleEl={getArticleEl}
            getSettings={getSettings}
            getCurrentFileUrl={getCurrentFileUrl}
            onSave={onSave}
          />
        </ViewerShell>
      </EditorProvider>
    </ToastProvider>
  )
}
