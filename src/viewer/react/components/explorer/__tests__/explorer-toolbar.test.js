import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExplorerToolbar } from '../ExplorerToolbar.jsx'

const render = props => renderToStaticMarkup(React.createElement(ExplorerToolbar, {
  summaryFileCount: 3,
  isRefreshing: false,
  refreshDisabled: false,
  ...props
}))

describe('file list refresh control', () => {
  it('shows the location and count without repeating Folder tree or Folder files', () => {
    const html = render({ summaryDirectoryLabel: '/project/docs', summaryFileCount: 114, showCollapseAllFolders: true })
    expect(html).toContain('title="/project/docs">docs</span>')
    expect(html).toContain('· 114 files')
    expect(html).not.toContain('Folder tree')
    expect(html).not.toContain('Folder files')
    expect(html).not.toContain('mdp-explorer__toolbar-folder')
    expect(render({ summaryFileCount: 1 })).toContain('· 1 file')
  })

  it('shows scanning status instead of a misleading zero-file count', () => {
    const html = render({ isBusy: true, summaryFileCount: 0 })
    expect(html).toContain('Scanning…')
    expect(html).not.toContain('· 0 files')
  })

  it('keeps the idle control available with separate list and arrow artwork', () => {
    const html = render()
    expect(html).toContain('aria-label="Refresh file list"')
    expect(html).toContain('aria-busy="false"')
    expect(html).not.toContain('disabled=""')
    expect(html).toMatch(/<path d="[^"]+"><\/path><path data-icon-part="arrow"/)
  })

  it('exposes the busy state and prevents another refresh until completion', () => {
    const html = render({ isRefreshing: true })
    expect(html).toContain('mdp-explorer__refresh-btn is-refreshing')
    expect(html).toContain('aria-label="Refreshing file list"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled=""')
  })
})
