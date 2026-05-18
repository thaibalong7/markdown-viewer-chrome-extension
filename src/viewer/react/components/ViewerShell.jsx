import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEditorState } from '../contexts/EditorContext.jsx'
import { Sidebar } from './Sidebar.jsx'
import { EditorPanel } from './EditorPanel.jsx'
import { EditorSplitResizeHandle } from './EditorSplitResizeHandle.jsx'
import { StatusBar } from './StatusBar.jsx'
import { Toast } from './Toast.jsx'
import { countWords } from '../../editor/editor-stats.js'

export function ViewerShell({
  children,
  onShellReady,
  settings,
  tocItems,
  tocReady,
  explorerBridge,
  markdown,
  onContentChange,
  onEditorReady,
  onEditorDestroy,
  onEditorScroll,
  onTocClickInEditor,
  onEditModeChange,
  onSave,
  saveStatus = 'saved'
}) {
  const rootNodeRef = useRef(null)
  const wasSplitEditRef = useRef(false)
  const articleRef = useRef(null)
  const hasSignaledReadyRef = useRef(false)
  const [rootEl, setRootEl] = useState(null)
  const [contentPaneEl, setContentPaneEl] = useState(null)
  const [editorPanelEl, setEditorPanelEl] = useState(null)
  const [splitResizeHandleEl, setSplitResizeHandleEl] = useState(null)
  const [editorStatus, setEditorStatus] = useState(() => ({
    line: 1,
    col: 1,
    wordCount: countWords(markdown)
  }))
  const [editorReady, setEditorReady] = useState(false)
  const editorState = useEditorState()

  const isEditMode = editorState.enabled && (editorState.mode === 'split' || editorState.mode === 'focus')

  const isFocusMode = editorState.enabled && editorState.mode === 'focus'
  const isSplitMode = editorState.enabled && editorState.mode === 'split'
  const sidebarVisible = editorState.sidebarVisible && !editorState.enabled
  const sidebarHidden = !sidebarVisible

  const setContentPaneRef = useCallback((node) => {
    setContentPaneEl((prev) => (prev === node ? prev : node))
  }, [])

  const setEditorPanelRef = useCallback((node) => {
    setEditorPanelEl((prev) => (prev === node ? prev : node))
  }, [])

  const setSplitResizeHandleRef = useCallback((node) => {
    setSplitResizeHandleEl((prev) => (prev === node ? prev : node))
  }, [])

  useLayoutEffect(() => {
    if (isSplitMode && !wasSplitEditRef.current && contentPaneEl && rootNodeRef.current) {
      const y = rootNodeRef.current.scrollTop
      contentPaneEl.scrollTop = y
    }
    wasSplitEditRef.current = isSplitMode
  }, [isSplitMode, contentPaneEl])

  useEffect(() => {
    onEditModeChange?.(editorState.enabled)
  }, [editorState.enabled, onEditModeChange])

  const shouldUsePaneForScroll = isSplitMode && contentPaneEl
  const scrollRootForSidebar = shouldUsePaneForScroll ? contentPaneEl : rootEl

  const handleRootRef = useCallback((node) => {
    rootNodeRef.current = node
    setRootEl(node)
  }, [])

  useLayoutEffect(() => {
    if (hasSignaledReadyRef.current) return
    const root = rootNodeRef.current
    const article = articleRef.current
    if (!root || !article) return

    hasSignaledReadyRef.current = true
    onShellReady?.({
      root,
      article
    })
  }, [onShellReady, rootEl])

  const handleEditorStatusChange = useCallback((payload) => {
    setEditorStatus({
      line: payload?.line ?? 1,
      col: payload?.col ?? 1,
      wordCount: payload?.wordCount ?? 0
    })
    setEditorReady(true)
  }, [])

  const handleEditorDestroy = useCallback(() => {
    setEditorReady(false)
    onEditorDestroy?.()
  }, [onEditorDestroy])

  useEffect(() => {
    if (!isEditMode) {
      setEditorReady(false)
    }
  }, [isEditMode])

  const bodyClassNames = ['mdp-body']
  if (sidebarHidden) bodyClassNames.push('mdp-body--no-toc')
  if (isSplitMode) bodyClassNames.push('mdp-body--edit-split')
  if (isFocusMode) bodyClassNames.push('mdp-body--edit-focus')
  if (isEditMode) bodyClassNames.push('mdp-body--edit-with-status')

  return (
    <div className="mdp-root" ref={handleRootRef}>
      {children}
      <div className={bodyClassNames.join(' ')}>
        {sidebarVisible && (
          <Sidebar
            settings={settings}
            tocItems={tocItems}
            tocReady={tocReady}
            explorerBridge={explorerBridge}
            scrollRoot={scrollRootForSidebar}
            forceHidden={false}
            onTocClickInEditor={onTocClickInEditor}
          />
        )}

        {(isSplitMode || isFocusMode) && (
          <EditorPanel
            ref={setEditorPanelRef}
            markdown={markdown}
            onContentChange={onContentChange}
            onEditorReady={onEditorReady}
            onEditorDestroy={handleEditorDestroy}
            onEditorScroll={isSplitMode ? onEditorScroll : undefined}
            onSave={onSave}
            onStatusChange={handleEditorStatusChange}
            editorSettings={settings?.editor}
          />
        )}

        {isSplitMode && (
          <EditorSplitResizeHandle
            rootEl={rootEl}
            editorEl={editorPanelEl}
            previewEl={contentPaneEl}
            handleEl={splitResizeHandleEl}
            setHandleEl={setSplitResizeHandleRef}
          />
        )}

        <main className="mdp-content-pane" ref={setContentPaneRef}>
          {isSplitMode && (
            <div className="mdp-edit-mode-note" role="note" aria-live="polite">
              Preview font size and line height are synced with editor while editing. Reader settings return
              when you exit edit mode.
            </div>
          )}
          <article className="mdp-markdown-body" ref={articleRef} />
        </main>

        {isEditMode && editorReady && (
          <StatusBar
            line={editorStatus.line}
            col={editorStatus.col}
            wordCount={editorStatus.wordCount}
            saveStatus={saveStatus}
          />
        )}
      </div>
      <Toast />
    </div>
  )
}
