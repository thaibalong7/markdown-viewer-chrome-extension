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
  it('marks raster rows and renders the image-specific icon and label', () => {
    const html = renderFile({
      displayName: 'photo.png',
      href: 'file:///docs/photo.png',
      fileTypeId: 'raster-image'
    })

    expect(html).toContain('data-file-type="raster-image"')
    expect(html).toContain('title="photo.png — Image"')
    expect(html).toContain('<rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect>')
  })

  it('marks SVG rows as a distinct type with a vector-specific icon', () => {
    const html = renderFile({
      displayName: 'diagram.svg',
      href: 'file:///docs/diagram.svg',
      fileTypeId: 'svg-image'
    })

    expect(html).toContain('data-file-type="svg-image"')
    expect(html).toContain('title="diagram.svg — SVG image"')
    expect(html).toContain('<path d="M5 4.5h14v15H5z"></path>')
  })

  it('uses the diagram presentation for standalone Mermaid files', () => {
    const html = renderFile({
      displayName: 'chart.mermaid',
      href: 'file:///docs/chart.mermaid',
      fileTypeId: 'mermaid'
    })

    expect(html).toContain('data-file-type="mermaid"')
    expect(html).toContain('title="chart.mermaid — Mermaid diagram"')
    expect(html).toContain('<rect x="3.5" y="4" width="6" height="5" rx="1"></rect>')
  })
})
