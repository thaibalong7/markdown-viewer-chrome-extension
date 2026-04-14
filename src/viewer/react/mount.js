import React from 'react'
import { createRoot } from 'react-dom/client'
import { ViewerApp } from './ViewerApp.jsx'

export function mountViewerReact(container, { settings, markdown, currentFileUrl } = {}) {
  const root = createRoot(container)
  let nextProps = {
    settings: settings || {},
    markdown: markdown || '',
    currentFileUrl: currentFileUrl || ''
  }

  const render = () => {
    root.render(React.createElement(ViewerApp, nextProps))
  }

  render()

  return {
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
    unmount() {
      root.unmount()
    }
  }
}
