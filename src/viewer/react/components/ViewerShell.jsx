import React, { useLayoutEffect, useRef } from 'react'
import { Toolbar } from './Toolbar.jsx'

export function ViewerShell({ children, onShellReady }) {
  const rootRef = useRef(null)
  const toolbarRef = useRef(null)
  const toolbarActionsRef = useRef(null)
  const sidebarRef = useRef(null)
  const tocContainerRef = useRef(null)
  const explorerContainerRef = useRef(null)
  const tabBarRef = useRef(null)
  const tabFilesRef = useRef(null)
  const tabOutlineRef = useRef(null)
  const filesPanelRef = useRef(null)
  const outlinePanelRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const contentPaneRef = useRef(null)
  const articleRef = useRef(null)
  const hasSignaledReadyRef = useRef(false)

  useLayoutEffect(() => {
    if (hasSignaledReadyRef.current) return
    if (
      !rootRef.current ||
      !toolbarRef.current ||
      !toolbarActionsRef.current ||
      !sidebarRef.current ||
      !tocContainerRef.current ||
      !explorerContainerRef.current ||
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
      explorerContainer: explorerContainerRef.current,
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
    <div className="mdp-root" ref={rootRef}>
      <Toolbar ref={toolbarRef} actionsRef={toolbarActionsRef}>
        {children}
      </Toolbar>
      <div className="mdp-body">
        <aside className="mdp-sidebar" ref={sidebarRef}>
          <div className="mdp-sidebar-tabs" role="tablist" aria-label="Sidebar" ref={tabBarRef}>
            <button
              type="button"
              className="mdp-sidebar-tab is-active"
              role="tab"
              aria-selected="true"
              id="mdp-tab-outline"
              aria-controls="mdp-panel-outline"
              ref={tabOutlineRef}
            >
              Outline
            </button>
            <button
              type="button"
              className="mdp-sidebar-tab"
              role="tab"
              aria-selected="false"
              id="mdp-tab-files"
              aria-controls="mdp-panel-files"
              ref={tabFilesRef}
            >
              Files
            </button>
          </div>

          <div
            className="mdp-sidebar-panel mdp-sidebar-panel--outline"
            role="tabpanel"
            id="mdp-panel-outline"
            aria-labelledby="mdp-tab-outline"
            ref={outlinePanelRef}
          >
            <div className="mdp-sidebar__title">Outline</div>
            <nav className="mdp-toc" aria-label="Table of contents" ref={tocContainerRef} />
          </div>

          <div
            className="mdp-sidebar-panel mdp-sidebar-panel--files"
            role="tabpanel"
            id="mdp-panel-files"
            aria-labelledby="mdp-tab-files"
            hidden
            ref={filesPanelRef}
          >
            <div className="mdp-explorer-container" ref={explorerContainerRef} />
          </div>

          <div
            className="mdp-sidebar__resize-handle"
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin="220"
            aria-valuemax="520"
            tabIndex={0}
            ref={resizeHandleRef}
          />
        </aside>

        <main className="mdp-content-pane" ref={contentPaneRef}>
          <article className="mdp-markdown-body" ref={articleRef} />
        </main>
      </div>
    </div>
  )
}
