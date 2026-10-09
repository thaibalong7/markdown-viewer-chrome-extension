import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { FileRow } from '../FileRow.jsx'

function renderFile(file, depth = 1) {
  return renderToStaticMarkup(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(FileRow, {
        file,
        depth,
        isActive: false,
        onPick: () => {}
      })
    )
  )
}

describe('explorer file type presentation', () => {
  it('keeps a 12px indent step and lets SCSS own the inner padding', () => {
    const file = {
      displayName: 'notes.md',
      href: 'file:///docs/notes.md',
      fileTypeId: 'markdown'
    }

    expect(renderFile(file)).not.toContain('padding-left:')
    expect(renderFile(file)).toContain('--mdp-tree-row-indent:0px')
    expect(renderFile(file, 2)).not.toContain('padding-left:')
    expect(renderFile(file, 2)).toContain('--mdp-tree-row-indent:12px')
  })

  it('renders Markdown with its fixed identity color at its native grid size', () => {
    const html = renderFile({
      displayName: 'notes.md',
      href: 'file:///docs/notes.md',
      fileTypeId: 'markdown'
    })

    expect(html).toContain('data-file-type="markdown"')
    expect(html).toContain('fill="#60A5FA"')
    expect(html).toContain('viewBox="0 0 16 16"')
  })

  it('renders plain text with its own fixed identity color', () => {
    const html = renderFile({
      displayName: 'notes.txt',
      href: 'file:///docs/notes.txt',
      fileTypeId: 'text'
    })

    expect(html).toContain('data-file-type="text"')
    expect(html).toContain('stroke:#64748B;stroke-width:1.25')
  })

  it('renders SQL with its own database icon and label', () => {
    const html = renderFile({
      displayName: 'schema.sql',
      href: 'file:///docs/schema.sql',
      fileTypeId: 'sql'
    })

    expect(html).toContain('data-file-type="sql"')
    expect(html).toContain('title="schema.sql — SQL document"')
    expect(html).toContain('stroke:#F472B6;stroke-width:1.25')
  })

  it('marks raster rows and renders the image-specific icon and label', () => {
    const html = renderFile({
      displayName: 'photo.png',
      href: 'file:///docs/photo.png',
      fileTypeId: 'raster-image'
    })

    expect(html).toContain('data-file-type="raster-image"')
    expect(html).toContain('title="photo.png — Image"')
    expect(html).toContain('stroke:#C084FC;stroke-width:1.25')
  })

  it('marks SVG rows as a distinct type with a vector-specific icon', () => {
    const html = renderFile({
      displayName: 'diagram.svg',
      href: 'file:///docs/diagram.svg',
      fileTypeId: 'svg-image'
    })

    expect(html).toContain('data-file-type="svg-image"')
    expect(html).toContain('title="diagram.svg — SVG image"')
    expect(html).toContain('stroke:#F472B6;stroke-width:1.25')
  })

  it('uses the diagram presentation for standalone Mermaid files', () => {
    const html = renderFile({
      displayName: 'chart.mermaid',
      href: 'file:///docs/chart.mermaid',
      fileTypeId: 'mermaid'
    })

    expect(html).toContain('data-file-type="mermaid"')
    expect(html).toContain('title="chart.mermaid — Mermaid diagram"')
    expect(html).toContain('stroke:#F59E0B;stroke-width:1.25')
  })
})
