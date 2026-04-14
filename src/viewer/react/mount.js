import React from 'react'
import { createRoot } from 'react-dom/client'
import { ViewerApp } from './ViewerApp.jsx'

export function mountViewerReact(container, options = {}) {
  const {
    settings,
    markdown,
    currentFileUrl,
    tocItems,
    onShellReady,
    getArticleEl,
    getSettings,
    getCurrentFileUrl,
    showToast
  } = options
  const root = createRoot(container)
  let shellReadyResolve = () => {}
  const partsPromise = new Promise((resolve) => {
    shellReadyResolve = resolve
  })
  let shellReadySignaled = false

  let nextProps = {
    settings: settings || {},
    markdown: markdown || '',
    currentFileUrl: currentFileUrl || '',
    tocItems: Array.isArray(tocItems) ? tocItems : [],
    getArticleEl,
    getSettings,
    getCurrentFileUrl,
    showToast,
    onShellReady: (parts) => {
      if (!shellReadySignaled) {
        shellReadySignaled = true
        shellReadyResolve(parts)
      }
      onShellReady?.(parts)
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
    updateMarkdown(nextMarkdown) {
      nextProps = { ...nextProps, markdown: nextMarkdown || '' }
      render()
    },
    updateCurrentFileUrl(nextFileUrl) {
      nextProps = { ...nextProps, currentFileUrl: nextFileUrl || '' }
      render()
    },
    updateTocItems(nextTocItems) {
      nextProps = { ...nextProps, tocItems: Array.isArray(nextTocItems) ? nextTocItems : [] }
      render()
    },
    updateBridge(nextBridge = {}) {
      nextProps = { ...nextProps, ...nextBridge }
      render()
    },
    unmount() {
      root.unmount()
    }
  }
}
