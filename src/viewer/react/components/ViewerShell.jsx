import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEditorDispatch, useEditorState } from '../contexts/EditorContext.jsx'
import { Sidebar } from './Sidebar.jsx'
import { RightRail } from './RightRail.jsx'
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
  documentUiState,
  onContentChange,
  onEditorReady,
  onEditorDestroy,
  onEditorScroll,
  onTocClickInEditor,
  onHeadingNavigate,
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
  const editorDispatch = useEditorDispatch()

  const capabilities = documentUiState?.capabilities || {}
  const editorAllowed = capabilities.edit === true && documentUiState?.sourceKind === 'file-url'
  const isEditMode = editorAllowed && editorState.enabled && (editorState.mode === 'split' || editorState.mode === 'focus')

  const isFocusMode = isEditMode && editorState.mode === 'focus'
  const isSplitMode = isEditMode && editorState.mode === 'split'
  const filesAvailable = !isEditMode
  const filesExpanded = filesAvailable && editorState.sidebarVisible
  const outlineAvailable = capabilities.outline === true && settings?.layout?.showToc !== false && !isEditMode
  const outlineExpanded = outlineAvailable && editorState.outlineVisible

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
    onEditModeChange?.(isEditMode)
  }, [isEditMode, onEditModeChange])

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

  const handleFilesToggle = useCallback(() => {
    editorDispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [editorDispatch])

  const handleOutlineToggle = useCallback(() => {
    editorDispatch({ type: 'TOGGLE_OUTLINE' })
  }, [editorDispatch])

  useEffect(() => {
    if (!isEditMode) {
      setEditorReady(false)
    }
  }, [isEditMode])

  const bodyClassNames = ['mdp-body']
  if (!filesAvailable) bodyClassNames.push('mdp-body--no-files')
  else if (!filesExpanded) bodyClassNames.push('mdp-body--files-collapsed')
  if (!outlineExpanded) bodyClassNames.push('mdp-body--no-outline')
  if (isSplitMode) bodyClassNames.push('mdp-body--edit-split')
  if (isFocusMode) bodyClassNames.push('mdp-body--edit-focus')
  if (isEditMode) bodyClassNames.push('mdp-body--edit-with-status')

  return (
    <div className="mdp-root" ref={handleRootRef}>
      <div className={bodyClassNames.join(' ')}>
        {filesAvailable && (
          <Sidebar
            explorerBridge={explorerBridge}
            rootEl={rootEl}
            settings={settings}
            expanded={filesExpanded}
            onToggle={handleFilesToggle}
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

        <RightRail
          actions={children}
          outlineAvailable={outlineAvailable}
          outlineExpanded={outlineExpanded}
          onOutlineToggle={handleOutlineToggle}
          settings={settings}
          tocItems={tocItems}
          tocReady={tocReady}
          scrollRoot={scrollRootForSidebar}
          onTocClickInEditor={onTocClickInEditor}
          onHeadingNavigate={onHeadingNavigate}
        />

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
