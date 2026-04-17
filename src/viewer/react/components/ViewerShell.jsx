import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Toolbar } from './Toolbar.jsx'
import { Sidebar } from './Sidebar.jsx'
import { Toast } from './Toast.jsx'

export function ViewerShell({ children, onShellReady, settings, tocItems, explorerBridge }) {
  const rootRef = useRef(null)
  const toolbarRef = useRef(null)
  const toolbarActionsRef = useRef(null)
  const sidebarRef = useRef(null)
  const tocContainerRef = useRef(null)
  const tabBarRef = useRef(null)
  const tabFilesRef = useRef(null)
  const tabOutlineRef = useRef(null)
  const filesPanelRef = useRef(null)
  const outlinePanelRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const contentPaneRef = useRef(null)
  const articleRef = useRef(null)
  const hasSignaledReadyRef = useRef(false)
  const [rootEl, setRootEl] = useState(null)
  const handleRootRef = useCallback((node) => {
    rootRef.current = node
    setRootEl(node)
  }, [])

  useLayoutEffect(() => {
    if (hasSignaledReadyRef.current) return
    if (
      !rootRef.current ||
      !toolbarRef.current ||
      !toolbarActionsRef.current ||
      !sidebarRef.current ||
      !tocContainerRef.current ||
      !tabBarRef.current ||
      !tabFilesRef.current ||
      !tabOutlineRef.current ||
      !filesPanelRef.current ||
      !outlinePanelRef.current ||
      !resizeHandleRef.current ||
      !contentPaneRef.current ||
      !articleRef.current
    ) {
      return
    }

    hasSignaledReadyRef.current = true
    onShellReady?.({
      root: rootRef.current,
      toolbar: toolbarRef.current,
      toolbarActions: toolbarActionsRef.current,
      sidebar: sidebarRef.current,
      tocContainer: tocContainerRef.current,
      tabBar: tabBarRef.current,
      tabFiles: tabFilesRef.current,
      tabOutline: tabOutlineRef.current,
      filesPanel: filesPanelRef.current,
      outlinePanel: outlinePanelRef.current,
      resizeHandle: resizeHandleRef.current,
      contentPane: contentPaneRef.current,
      article: articleRef.current
    })
  }, [onShellReady])

  return (
    <div className="mdp-root" ref={handleRootRef}>
      <Toolbar ref={toolbarRef} actionsRef={toolbarActionsRef}>
        {children}
      </Toolbar>
      <div className="mdp-body">
        <Sidebar
          settings={settings}
          tocItems={tocItems}
          explorerBridge={explorerBridge}
          scrollRoot={rootEl}
          onSidebarRef={(node) => {
            sidebarRef.current = node
          }}
          onTabBarRef={(node) => {
            tabBarRef.current = node
          }}
          onTabFilesRef={(node) => {
            tabFilesRef.current = node
          }}
          onTabOutlineRef={(node) => {
            tabOutlineRef.current = node
          }}
          onFilesPanelRef={(node) => {
            filesPanelRef.current = node
          }}
          onOutlinePanelRef={(node) => {
            outlinePanelRef.current = node
          }}
          onTocContainerRef={(node) => {
            tocContainerRef.current = node
          }}
          onResizeHandleRef={(node) => {
            resizeHandleRef.current = node
          }}
        />

        <main className="mdp-content-pane" ref={contentPaneRef}>
          <article className="mdp-markdown-body" ref={articleRef} />
        </main>
      </div>
      <Toast />
    </div>
  )
}
