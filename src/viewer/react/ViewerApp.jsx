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
  onHeadingNavigate,
  onEditModeChange,
  onPrepareEdit,
  onSave,
  onViewModeChange,
  onThemeToggle,
  dirty = false,
  saveStatus = 'saved',
  exitEditRequest = 0
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
          getCurrentFileUrl={getCurrentFileUrl}
          onContentChange={onContentChange}
          onEditorReady={onEditorReady}
          onEditorDestroy={onEditorDestroy}
          onEditorScroll={onEditorScroll}
          onTocClickInEditor={onTocClickInEditor}
          onHeadingNavigate={onHeadingNavigate}
          onEditModeChange={onEditModeChange}
          onSave={onSave}
          saveStatus={saveStatus}
          exitEditRequest={exitEditRequest}
        >
          <FloatingActions
            getArticleEl={getArticleEl}
            getSettings={getSettings}
            getCurrentFileUrl={getCurrentFileUrl}
            documentUiState={documentUiState}
            onPrepareEdit={onPrepareEdit}
            onSave={onSave}
            onViewModeChange={onViewModeChange}
            onThemeToggle={onThemeToggle}
          />
        </ViewerShell>
      </EditorProvider>
    </ToastProvider>
  )
}
