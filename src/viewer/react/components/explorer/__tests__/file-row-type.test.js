import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { FileRow } from '../FileRow.jsx'

function renderFile(file) {
  return renderToStaticMarkup(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(FileRow, {
        file,
        depth: 1,
        isActive: false,
        onPick: () => {}
      })
    )
  )
}

describe('explorer file type presentation', () => {
  it('renders Markdown with its recognizable M and down-arrow mark', () => {
    const html = renderFile({
      displayName: 'notes.md',
      href: 'file:///docs/notes.md',
      fileTypeId: 'markdown'
    })

    expect(html).toContain('data-file-type="markdown"')
    expect(html).toContain('fill="#60A5FA"')
    expect(html).toContain('d="M3 15.714V8h2.323')
  })

  it('renders plain text with strong horizontal text lines', () => {
    const html = renderFile({
      displayName: 'notes.txt',
      href: 'file:///docs/notes.txt',
      fileTypeId: 'text'
    })

    expect(html).toContain('data-file-type="text"')
    expect(html).toContain('<rect width="16" height="2" x="4" y="6" fill="#64748B" rx="1"></rect>')
  })

  it('marks raster rows and renders the image-specific icon and label', () => {
    const html = renderFile({
      displayName: 'photo.png',
      href: 'file:///docs/photo.png',
      fileTypeId: 'raster-image'
    })

    expect(html).toContain('data-file-type="raster-image"')
    expect(html).toContain('title="photo.png — Image"')
    expect(html).toContain('<circle cx="15" cy="9" r="2" fill="#C084FC"></circle>')
  })

  it('marks SVG rows as a distinct type with a vector-specific icon', () => {
    const html = renderFile({
      displayName: 'diagram.svg',
      href: 'file:///docs/diagram.svg',
      fileTypeId: 'svg-image'
    })

    expect(html).toContain('data-file-type="svg-image"')
    expect(html).toContain('title="diagram.svg — SVG image"')
    expect(html).toContain('<rect width="4" height="4" x="3" y="3" fill="#F472B6" rx="1"></rect>')
  })

  it('uses the diagram presentation for standalone Mermaid files', () => {
    const html = renderFile({
      displayName: 'chart.mermaid',
      href: 'file:///docs/chart.mermaid',
      fileTypeId: 'mermaid'
    })

    expect(html).toContain('data-file-type="mermaid"')
    expect(html).toContain('title="chart.mermaid — Mermaid diagram"')
    expect(html).toContain('<rect width="8" height="6" x="8" y="3.5" fill="#F59E0B" rx="1"></rect>')
  })
})
