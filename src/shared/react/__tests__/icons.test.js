import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppIcon } from '../AppIcon.jsx'
import { FileTypeIcon } from '../FileTypeIcon.jsx'
import { createAppIconSvg } from '../../icons/create-app-icon.js'
import { FolderRow } from '../../../viewer/react/components/explorer/FolderRow.jsx'
import { ToastProvider } from '../../../viewer/react/contexts/ToastContext.jsx'

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const children = markup => markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</svg>'))

// A namespace-only DOM double: the imperative adapter must work without any HTML parser/sink.
function svgElement(tag) {
  return {
    tag, attributes: {}, children: [],
    setAttribute(name, value) { this.attributes[name] = value },
    appendChild(child) { this.children.push(child) },
    serialize() {
      const attrs = Object.entries(this.attributes).map(([name, value]) => `${name}="${value}"`).join(' ')
      return `<${this.tag}${attrs ? ` ${attrs}` : ''}>${this.children.map(child => child.serialize()).join('')}</${this.tag}>`
    }
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('shared icon integration', () => {
  it('uses safe fallbacks for unknown names, including inherited object properties', () => {
    expect(render(AppIcon, { name: 'constructor' })).toBe(render(AppIcon, { name: 'info' }))
    expect(render(FileTypeIcon, { name: '__proto__' })).toBe(render(FileTypeIcon, { name: 'text' }))
  })

  it.each(['copy', 'expand', 'zoom-in', 'recenter', 'close', 'refresh', 'folder-select', 'file-details', 'back-to-file', 'leave-workspace'])('keeps React and DOM artwork identical for %s', name => {
    vi.stubGlobal('document', { createElementNS: (_, tag) => svgElement(tag) })
    const dom = createAppIconSvg(name, { width: 14, height: 14, className: 'toolbar-icon' })
    expect(children(dom.serialize())).toBe(children(render(AppIcon, { name })))
    expect(dom.attributes).toMatchObject({
      width: '14', height: '14', class: 'toolbar-icon', viewBox: '0 0 24 24',
      'stroke-width': '1.8', 'aria-hidden': 'true', focusable: 'false'
    })
  })

  it('preserves file identity even when a selected control supplies its own color or stroke', () => {
    const markup = render(FileTypeIcon, {
      name: 'markdown', style: { color: 'red', stroke: 'blue', strokeWidth: 3 }
    })
    expect(markup).toContain('viewBox="0 0 16 16"')
    expect(markup).toContain('style="color:#60A5FA;stroke:#60A5FA;stroke-width:1.25"')
    expect(markup).toContain('focusable="false"')
  })

  it('changes folder artwork with expansion while retaining color and disclosure semantics', () => {
    const treeRow = { node: { href: 'file:///docs/', name: 'docs' }, depth: 1, fileCount: 0, guides: [], stem: false }
    const closed = renderToStaticMarkup(React.createElement(ToastProvider, null, React.createElement(FolderRow, { treeRow: { ...treeRow, expanded: false } })))
    const open = renderToStaticMarkup(React.createElement(ToastProvider, null, React.createElement(FolderRow, { treeRow: { ...treeRow, expanded: true } })))
    expect(closed).toContain('aria-expanded="false"')
    expect(open).toContain('aria-expanded="true"')
    for (const markup of [closed, open]) expect(markup).toContain('color:#D6A34A;stroke:#D6A34A;stroke-width:1.25')
    expect(open).toContain(children(render(FileTypeIcon, { name: 'folder-open' })))
    expect(closed).toContain(children(render(FileTypeIcon, { name: 'folder' })))
    expect(children(render(FileTypeIcon, { name: 'folder-open' }))).not.toBe(children(render(FileTypeIcon, { name: 'folder' })))
  })

  it('keeps SQL and SVG distinguishable through shape when their identity color matches', () => {
    const sql = render(FileTypeIcon, { name: 'database' })
    const vector = render(FileTypeIcon, { name: 'vector' })
    expect(sql).toContain('stroke:#F472B6')
    expect(vector).toContain('stroke:#F472B6')
    expect(children(sql)).not.toBe(children(vector))
  })
})
