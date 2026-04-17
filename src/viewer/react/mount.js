import React from 'react'
import { createRoot } from 'react-dom/client'
import { ViewerApp } from './ViewerApp.jsx'

export function mountViewerReact(container, options = {}) {
  const {
    settings,
    tocItems,
    explorerBridge,
    onShellReady,
    getArticleEl,
    getSettings,
    getCurrentFileUrl
  } = options
  const root = createRoot(container)
  let shellReadyResolve = () => { }
  /** Resolves to `{ root, article }` once the React shell has mounted. */
  const partsPromise = new Promise((resolve) => {
    shellReadyResolve = resolve
  })
  let shellReadySignaled = false
  /** @type {((message: string, durationMs?: number) => void) | null} */
  let showToastBridge = null

  let nextProps = {
    settings: settings || {},
    tocItems: Array.isArray(tocItems) ? tocItems : [],
    explorerBridge: explorerBridge || null,
    getArticleEl,
    getSettings,
    getCurrentFileUrl,
    onShowToastReady: (showToastFn) => {
      showToastBridge = typeof showToastFn === 'function' ? showToastFn : null
    },
    onShellReady: (shellElements) => {
      if (!shellReadySignaled) {
        shellReadySignaled = true
        shellReadyResolve(shellElements)
      }
      onShellReady?.(shellElements)
    }
  }

  const render = () => {
    root.render(React.createElement(ViewerApp, nextProps))
  }

  render()

  return {
    partsPromise,
    updateSettings(nextSettings) {
      nextProps = { ...nextProps, settings: nextSettings || {} }
      render()
    },
    updateChromeState({ tocItems } = {}) {
      if (tocItems !== undefined) {
        nextProps = { ...nextProps, tocItems: Array.isArray(tocItems) ? tocItems : [] }
      }
      render()
    },
    /** Re-render chrome so components that read live URLs (e.g. toolbar actions) stay in sync. */
    bumpChrome() { render() },
    updateTocItems(nextTocItems) {
      this.updateChromeState({ tocItems: nextTocItems })
    },
    showToast(message, options = {}) {
      if (typeof message !== 'string') return
      showToastBridge?.(message, options?.durationMs)
    },
    unmount() { root.unmount(); }
  }
}
