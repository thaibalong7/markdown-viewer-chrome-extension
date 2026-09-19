import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MDP_WS_FILE } from '../../../../shared/constants/explorer.js'
import { EditorProvider } from '../../contexts/EditorContext.jsx'
import { ToastProvider } from '../../contexts/ToastContext.jsx'
import { FloatingActions } from '../FloatingActions.jsx'
import { getDocumentCapabilities } from '../../../../shared/file-types.js'

function renderActions(
  currentFileUrl,
  fileTypeId = 'markdown',
  viewMode = 'rendered',
  loading = false,
  themePreset = 'light',
  onThemeToggle = () => {}
) {
  return renderToStaticMarkup(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        EditorProvider,
        null,
        React.createElement(FloatingActions, {
          getArticleEl: () => null,
          getSettings: () => ({ theme: { preset: themePreset } }),
          getCurrentFileUrl: () => currentFileUrl,
          documentUiState: {
            displayName: fileTypeId === 'text'
              ? 'notes.txt'
              : fileTypeId === 'mermaid'
                ? 'chart.mermaid'
                : fileTypeId === 'raster-image'
                  ? 'photo.png'
                  : fileTypeId === 'svg-image' ? 'diagram.svg' : 'README.md',
            sourceKind: currentFileUrl.startsWith('file:') ? 'file-url' : 'workspace-file',
            capabilities: getDocumentCapabilities(fileTypeId),
            viewMode,
            loading
          },
          onSave: () => {},
          onThemeToggle
        })
      )
    )
  )
}

describe('current document-action visibility assumptions', () => {
  it('shows Markdown edit, print, export, and copy-link actions for a local file', () => {
    const html = renderActions('file:///fixtures/navigation/index.md')

    expect(html).toContain('mdp-floating-actions--rail-strip')
    expect(html).toContain('aria-label="Edit markdown"')
    expect(html).toContain('aria-label="Print — use Save as PDF in the print dialog."')
    expect(html).toContain('aria-label="Download — HTML or Word (.doc)."')
    expect(html).toContain('aria-label="Copy open file link"')
    expect(html).not.toContain('files panel')
  })

  it('keeps print/export visible but disables edit and copy-link for a virtual workspace file', () => {
    const html = renderActions(`${MDP_WS_FILE}${encodeURIComponent('Dự án/README.md')}`)

    expect(html).not.toContain('aria-label="Edit markdown"')
    expect(html).toContain('aria-label="Print — use Save as PDF in the print dialog."')
    expect(html).toContain('aria-label="Download — HTML or Word (.doc)."')
    expect(html).toMatch(/<button[^>]*aria-label="Copy open file link"[^>]*disabled=""/)
  })

  it('shows only generic and print actions for a plain text document', () => {
    const html = renderActions('file:///fixtures/notes.txt', 'text')

    expect(html).not.toContain('aria-label="Edit markdown"')
    expect(html).not.toContain('aria-label="Download — HTML or Word (.doc)."')
    expect(html).toContain('aria-label="Print — use Save as PDF in the print dialog."')
    expect(html).toContain('aria-label="Copy open file link"')
    expect(html).not.toContain('files panel')
  })

  it('shows only generic and print actions for a raster image document', () => {
    const html = renderActions('file:///fixtures/photo.png', 'raster-image')

    expect(html).not.toContain('aria-label="Edit markdown"')
    expect(html).not.toContain('aria-label="Download — HTML or Word (.doc)."')
    expect(html).toContain('aria-label="Print — use Save as PDF in the print dialog."')
    expect(html).toContain('aria-label="Copy open file link"')
    expect(html).not.toContain('files panel')
  })

  it('shows no raw toggle or Markdown-only actions for an SVG document', () => {
    const html = renderActions('file:///fixtures/diagram.svg', 'svg-image')

    expect(html).not.toContain('aria-label="Edit markdown"')
    expect(html).not.toContain('aria-label="Download — HTML or Word (.doc)."')
    expect(html).not.toContain('View source')
    expect(html).toContain('aria-label="Print — use Save as PDF in the print dialog."')
    expect(html).toContain('aria-label="Copy open file link"')
    expect(html).not.toContain('files panel')
  })

  it('shows an accessible pressed-state toggle only for standalone Mermaid', () => {
    const rendered = renderActions('file:///fixtures/chart.mermaid', 'mermaid')
    expect(rendered).toContain('aria-label="View source"')
    expect(rendered).toContain('aria-pressed="false"')
    expect(rendered).not.toContain('aria-label="Edit markdown"')
    expect(rendered).not.toContain('aria-label="Download — HTML or Word (.doc)."')

    const raw = renderActions('file:///fixtures/chart.mermaid', 'mermaid', 'raw')
    expect(raw).toContain('aria-label="View diagram"')
    expect(raw).toContain('aria-pressed="true"')

    expect(renderActions('file:///fixtures/notes.txt', 'text')).not.toContain('View source')
  })

  it('disables document operations while the next document is loading', () => {
    const html = renderActions('file:///fixtures/chart.mermaid', 'mermaid', 'rendered', true)

    expect(html).toMatch(/<button[^>]*aria-label="View source"[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*aria-label="Copy open file link"[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*aria-label="Print — use Save as PDF in the print dialog\."[^>]*disabled=""/)
  })

  it('offers a fixed light/dark theme toggle without absorbing future presets', () => {
    const lightThemeHtml = renderActions('file:///fixtures/index.md')
    const darkThemeHtml = renderActions(
      'file:///fixtures/index.md',
      'markdown',
      'rendered',
      false,
      'dark'
    )
    expect(lightThemeHtml).toContain('aria-label="Switch to dark theme"')
    expect(lightThemeHtml).toContain('mdp-fab-btn__theme-icon--dark')
    expect(darkThemeHtml).toContain('aria-label="Switch to light theme"')
    expect(darkThemeHtml).toContain('mdp-fab-btn__theme-icon--light')
    expect(renderActions('file:///fixtures/index.md', 'markdown', 'rendered', false, 'sepia'))
      .not.toContain('mdp-fab-btn--theme')
    expect(renderActions('file:///fixtures/index.md', 'markdown', 'rendered', false, 'light', null))
      .not.toContain('mdp-fab-btn--theme')
  })
})
