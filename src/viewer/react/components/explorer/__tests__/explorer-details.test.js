import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { ExplorerHeader } from '../ExplorerHeader.jsx'
import { FilesPanel } from '../../FilesPanel.jsx'

const layout = vi.hoisted(() => ({ width: 240, badgeWidth: 120, coarse: false }))
vi.mock('../../../hooks/explorer/useExplorerDetailsLayout.js', () => ({ useExplorerDetailsLayout: (_row, badge) => badge ? layout : { ...layout, badgeWidth: 0 } }))
vi.mock('../../../hooks/useExplorer.js', () => ({
  useExplorer: () => ({
    state: {
      view: 'empty', actionsMode: 'sibling', explorerMode: 'sibling', files: [], tree: null,
      expandedMap: new Map(), summaryFileCount: 0, currentFileUrl: 'file:///docs/README.md'
    },
    actions: { onOpenAnotherFolder: vi.fn() }
  })
}))
const render = props => renderToStaticMarkup(React.createElement(ToastProvider, null,
  React.createElement(ExplorerHeader, {
    actionsMode: 'sibling', summaryDirectoryLabel: '/project/docs',
    filesContext: { currentLine: 'README.md', currentFileUrl: 'file:///docs/README.md', statusLine: 'This file’s folder' },
    ...props
  })
))
const heading = html => html.slice(0, html.indexOf('<div id='))

afterEach(() => {
  vi.unstubAllGlobals()
  Object.assign(layout, { width: 240, badgeWidth: 120, coarse: false })
})

describe('Files heading and details', () => {
  it('keeps Files, omits the Folder badge and redundant status, and starts details closed', () => {
    const html = render()
    expect(heading(html)).toContain('>Files</strong>')
    expect(html).not.toContain('mdp-explorer__badge')
    expect(html).not.toContain('This file’s folder')
    expect(heading(html)).not.toContain('README.md')
    expect(html).toContain('class="mdp-explorer__details" aria-hidden="true" inert=""')
    expect(html).toContain('Show file details')
    expect(html).toContain('mdp-explorer__details-toggle')
    expect(html).toContain('aria-expanded="false" aria-controls=')
    expect(html).toContain('aria-label="Open folder…"')
  })

  it.each(['false', 'true'])('keeps the Workspace badge and commands visible with stored details=%s', preference => {
    vi.stubGlobal('sessionStorage', { getItem: () => preference })
    const html = render({ actionsMode: 'workspace' })
    expect(heading(html)).toContain('class="mdp-explorer__badge mdp-explorer__badge--workspace">Workspace</span>')
    expect(preference === 'true' ? html.slice(html.indexOf('<div id=')) : heading(html)).toContain('aria-label="Switch folder…"')
    expect(html).toContain('Leave workspace')
    if (preference === 'true') expect(heading(html)).not.toContain('Switch folder…')
    expect(heading(html)).not.toContain('Back to original file')
    expect(html).toContain('aria-label="Workspace root: /project/docs"')
    expect(html).toContain(preference === 'true' ? 'Hide file details' : 'Show file details')
    expect(html).toContain(`aria-hidden="${preference !== 'true'}"`)
    expect(html.match(/aria-label="Copy link"/g)).toHaveLength(1)
    expect(html.match(/aria-label="Switch folder…"/g)).toHaveLength(1)
  })

  it('shows all commands directly when they fit, with a separate disclosure', () => {
    Object.assign(layout, { width: 500 })
    const html = heading(render({ showBack: true }))
    expect(html.match(/aria-label="(?:Open folder…|Copy link|Back to original file)"/g)).toHaveLength(3)
    expect(render({ showBack: true })).not.toContain('class="mdp-explorer__back-btn mdp-button"')
    expect(html).not.toContain('role="menuitem"')
    expect(html).not.toContain('More file actions')
    expect(html).toContain('mdp-explorer__details-toggle')
  })

  it('overflows commands on narrow touch layouts without hiding the separate disclosure or Workspace badge', () => {
    Object.assign(layout, { width: 176, badgeWidth: 120, coarse: true })
    const html = heading(render({ actionsMode: 'workspace' }))
    expect(html).toContain('>Workspace</span>')
    expect(html.match(/role="menuitem"/g)).toHaveLength(3)
    expect(html).toContain('Leave workspace')
    expect(render({ actionsMode: 'workspace' })).not.toContain('class="mdp-explorer__back-btn mdp-button"')
    expect(html).toContain('aria-label="Show file details" aria-expanded="false"')
    expect(html).toContain('mdp-explorer__menu-icon')
  })

  it('keeps the unavailable Copy menu title short and moves its reason into a tooltip', () => {
    Object.assign(layout, { width: 176, badgeWidth: 120, coarse: true })
    const html = heading(render({ actionsMode: 'workspace', filesContext: { currentFileUrl: 'mdp-ws-file:virtual' } }))
    expect(html).toMatch(/class="mdp-action-menu__tooltip-anchor"><button[^>]*aria-label="Copy link unavailable for workspace virtual files"[^>]*disabled=""[^>]*>[\s\S]*?<span>Copy link<\/span><\/button>/)
    expect(html).not.toContain('mdp-explorer__menu-description')
  })

  it('moves actions into the expanded card and shortens long paths without losing their full value', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'true' })
    Object.assign(layout, { width: 500 })
    const html = render({ summaryDirectoryLabel: '/Users/person/Documents/projects/markdown-plus' })
    expect(heading(html)).not.toContain('Copy link')
    expect(html).toContain('mdp-explorer__copy-link-btn')
    expect(html).toContain('mdp-explorer__folder-btn mdp-button')
    expect(html.indexOf('mdp-explorer__copy-link-btn')).toBeLessThan(html.indexOf('mdp-explorer__path'))
    expect(html.indexOf('mdp-explorer__back-btn')).toBeGreaterThan(html.indexOf('mdp-explorer__folder-btn'))
    expect(html).not.toContain('mdp-explorer__context-file-icon')
    expect(html).toContain('>…/projects/markdown-plus</span>')
    expect(html).toContain('title="/Users/person/Documents/projects/markdown-plus"')
    expect(html.match(/Copy link/g)).toHaveLength(1)
  })

  it('disables Copy for virtual files and navigation during scans while keeping details available', () => {
    Object.assign(layout, { width: 500 })
    const html = render({ actionsDisabled: true, actionsMode: 'workspace', filesContext: { currentFileUrl: 'mdp-ws-file:virtual' } })
    expect(html).toMatch(/aria-label="Copy link unavailable for workspace virtual files"[^>]*disabled=""/)
    expect(html).toMatch(/aria-label="Switch folder…"[^>]*disabled=""/)
    expect(html).toMatch(/aria-label="Leave workspace"[^>]*disabled=""/)
    expect(html).toMatch(/aria-label="Show file details" aria-expanded="false"[^>]*>/)
  })

  it('keeps warnings and scan-limit recovery outside the closed details region', () => {
    const html = render({ filesContext: { warningLine: 'Open file is outside the workspace.' }, depthNotice: 'Scan limit reached.' })
    const details = html.indexOf('aria-hidden="true" inert=""')
    expect(html.indexOf('class="mdp-explorer__context-warning')).toBeGreaterThan(details)
    expect(html.indexOf('class="mdp-explorer__depth-notice')).toBeGreaterThan(details)
    expect(html).toContain('Open file is outside the workspace.')
    expect(html).toContain('Adjust scan limits in Settings')
  })

  it('keeps Back disabled at the entry file and omits location commands in hidden mode', () => {
    Object.assign(layout, { width: 500 })
    expect(render({ showBack: false })).toMatch(/aria-label="Back to original file"[^>]*disabled=""/)
    const html = heading(render({ actionsMode: 'hidden' }))
    expect(html).not.toContain('Open folder')
    expect(html).not.toContain('Back to original file')
    expect(html).toContain('Show file details')
  })

  it.each(['sibling', 'workspace'])('collapses the labeled navigation row with details in %s mode', actionsMode => {
    Object.assign(layout, { width: 500 })
    const label = actionsMode === 'workspace' ? 'Leave workspace' : 'Back to original file'
    const iconPath = actionsMode === 'workspace' ? 'M13 15H3' : 'M13 12H3'
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    const collapsed = render({ actionsMode, showBack: true })
    expect(collapsed).not.toContain('mdp-explorer__back-btn')
    expect(heading(collapsed)).toContain(`aria-label="${label}"`)
    expect(heading(collapsed)).toContain(iconPath)
    expect(collapsed.match(new RegExp(`aria-label="${label}"`, 'g'))).toHaveLength(1)

    vi.stubGlobal('sessionStorage', { getItem: () => 'true' })
    const expanded = render({ actionsMode, showBack: true })
    expect(heading(expanded)).not.toContain(label)
    expect(expanded).toContain(`class="mdp-explorer__back-btn mdp-button" aria-label="${label}"`)
    expect(expanded).toContain(iconPath)
    expect(expanded).not.toContain('>←</')
    expect(expanded).toMatch(/class="mdp-explorer__detail-actions"><button[^>]*class="mdp-explorer__folder-btn mdp-button"[\s\S]*?<\/button><button[^>]*class="mdp-explorer__back-btn mdp-button"[\s\S]*?<\/button><\/div><\/div>/)
    expect(expanded.match(new RegExp(`aria-label="${label}"`, 'g'))).toHaveLength(1)
  })

  it('keeps empty-folder recovery in the header and tree controls available', () => {
    const html = renderToStaticMarkup(React.createElement(ToastProvider, null, React.createElement(FilesPanel, { explorerBridge: {} })))
    expect(html).toContain('id="mdp-panel-files"><div class="mdp-explorer"')
    expect(heading(html)).toContain('Open folder…')
    expect(html).toContain('No supported files found in this directory.')
    expect(html).toContain('aria-label="Refresh file list"')
    expect(html).not.toContain('Folder files')
  })
})
