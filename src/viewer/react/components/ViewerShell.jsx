import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Toolbar } from './Toolbar.jsx'
import { Sidebar } from './Sidebar.jsx'
import { Toast } from './Toast.jsx'

export function ViewerShell({ children, onShellReady, settings, tocItems, tocReady, explorerBridge }) {
  const rootNodeRef = useRef(null)
  const articleRef = useRef(null)
  const hasSignaledReadyRef = useRef(false)
  const [rootEl, setRootEl] = useState(null)
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

  return (
    <div className="mdp-root" ref={handleRootRef}>
      <Toolbar>{children}</Toolbar>
      <div className="mdp-body">
        <Sidebar
          settings={settings}
          tocItems={tocItems}
          tocReady={tocReady}
          explorerBridge={explorerBridge}
          scrollRoot={rootEl}
        />

        <main className="mdp-content-pane">
          <article className="mdp-markdown-body" ref={articleRef} />
        </main>
      </div>
      <Toast />
    </div>
  )
}
