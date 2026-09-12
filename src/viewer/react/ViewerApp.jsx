import React from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { EditorProvider } from './contexts/EditorContext.jsx'
import { DirtySync } from './components/DirtySync.jsx'
import { ViewerShell } from './components/ViewerShell.jsx'
import { FloatingActions } from './components/FloatingActions.jsx'

export function shouldInitiallyShowFilesPanel(matchMedia = globalThis.window?.matchMedia) {
  if (typeof matchMedia !== 'function') return true
  try {
    return matchMedia('(min-width: 1024px)').matches
  } catch {
    return true
  }
}

export function ViewerApp({
  settings,
  tocItems,
  tocReady,
  explorerBridge,
  markdown,
  documentUiState,
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
  onViewModeChange,
  dirty = false,
  saveStatus = 'saved'
}) {
  return (
    <ToastProvider onShowToastReady={onShowToastReady}>
      <EditorProvider initialSidebarVisible={shouldInitiallyShowFilesPanel()}>
        <DirtySync dirty={dirty} />
        <ViewerShell
          onShellReady={onShellReady}
          settings={settings}
          tocItems={tocItems}
          tocReady={tocReady}
          explorerBridge={explorerBridge}
          markdown={markdown}
          documentUiState={documentUiState}
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
            documentUiState={documentUiState}
            onSave={onSave}
            onViewModeChange={onViewModeChange}
          />
        </ViewerShell>
      </EditorProvider>
    </ToastProvider>
  )
}
