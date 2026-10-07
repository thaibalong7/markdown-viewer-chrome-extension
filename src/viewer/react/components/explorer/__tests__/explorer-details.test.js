import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { ExplorerHeader } from '../ExplorerHeader.jsx'
import { FilesPanel } from '../../FilesPanel.jsx'

const layout = vi.hoisted(() => ({ width: 240, badgeWidth: 60, coarse: false }))
vi.mock('../../../hooks/explorer/useExplorerDetailsLayout.js', () => ({ useExplorerDetailsLayout: () => layout }))
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
    actionsMode: 'sibling',
    filesContext: { currentLine: 'README.md', currentFileUrl: 'file:///docs/README.md', statusLine: 'This file’s folder' },
    ...props
  })
))
const summary = html => {
  const start = html.indexOf('class="mdp-explorer__context-summary"')
  return html.slice(start, html.indexOf('<div id=', start))
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.assign(layout, { width: 240, badgeWidth: 60, coarse: false })
})

describe('Files details disclosure', () => {
  it('uses the original card status row without adding a heading row or duplicating file identity', () => {
    const html = render()
    expect(html).toContain('aria-label="Minimize file details" aria-expanded="true"')
    expect(html.indexOf('class="mdp-explorer__context"')).toBeLessThan(html.indexOf('class="mdp-explorer__details-toggle"'))
    expect(summary(html)).toContain('This file’s folder')
    expect(summary(html)).not.toContain('README.md')
    expect(summary(html)).not.toContain('mdp-explorer__context-command"')
    expect(html).not.toContain('>Details</span>')
    expect(html.match(/class="mdp-explorer__context"/g)).toHaveLength(1)
    const ids = html.match(/aria-controls="([^"]+)"/)[1].split(' ')
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(html).toContain(`id="${id}" class="mdp-explorer__details is-expanded" aria-hidden="false"`)
    expect(html).not.toContain('inert=""')
    expect(html).toContain('Open folder…')
  })

  it.each(['sibling', 'workspace'])('keeps commands in the minimized row in %s mode, with hidden body and persistent warnings', actionsMode => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    const html = render({
      actionsMode,
      filesContext: { currentLine: 'README.md', currentFileUrl: 'file:///docs/README.md', warningLine: 'Current file is outside the workspace.' },
      depthNotice: 'Some folders were not scanned.'
    })
    expect(summary(html)).toContain('aria-label="Expand file details" aria-expanded="false"')
    expect(summary(html)).toContain('aria-label="Copy open file link"')
    expect(summary(html)).toContain(`aria-label="${actionsMode === 'workspace' ? 'Switch folder…' : 'Open folder…'}"`)
    expect(summary(html)).toContain(`aria-label="${actionsMode === 'workspace' ? 'Leave workspace' : 'Back to original file'}"`)
    expect(summary(html)).not.toContain('README.md')
    expect(html.match(/class="mdp-explorer__details" aria-hidden="true" inert=""/g)).toHaveLength(2)
    const lastRegion = html.lastIndexOf('aria-hidden="true" inert=""')
    expect(html.indexOf('class="mdp-explorer__context-warning')).toBeGreaterThan(lastRegion)
    expect(html.indexOf('class="mdp-explorer__depth-notice')).toBeGreaterThan(lastRegion)
    expect(html).toContain('Current file is outside the workspace.')
    expect(html).toContain('Adjust scan limits in Settings')
  })

  it('moves narrow touch commands into overflow without repeating them as direct icons', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    Object.assign(layout, { width: 176, badgeWidth: 80, coarse: true })
    const row = summary(render({ actionsMode: 'workspace' }))
    expect(row).toContain('aria-label="More file actions"')
    expect(row.match(/role="menuitem"/g)).toHaveLength(3)
    expect(row.match(/class="mdp-explorer__context-command"/g)).toHaveLength(1) // Overflow trigger only.
    expect(row.match(/Switch folder…/g)).toHaveLength(1)
    expect(row.match(/Leave workspace/g)).toHaveLength(1)
  })

  it.each([false, true])('keeps the full command row when it fits, with coarse=%s', coarse => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    Object.assign(layout, { width: 320, badgeWidth: 80, coarse })
    const row = summary(render({ actionsMode: 'workspace' }))
    expect(row).not.toContain('More file actions')
    expect(row.match(/class="mdp-explorer__context-command"/g)).toHaveLength(3)
    expect(row).toContain('aria-label="Copy open file link"')
    expect(row).toContain('aria-label="Switch folder…"')
    expect(row).toContain('aria-label="Leave workspace"')
  })

  it('retains capability and busy states while the disclosure remains usable', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    const row = summary(render({ actionsDisabled: true, filesContext: { currentFileUrl: 'mdp-ws-file:virtual' } }))
    expect(row).toMatch(/aria-label="Copy open file link"[^>]*disabled=""/)
    expect(row).toMatch(/aria-label="Open folder…"[^>]*disabled=""/)
    expect(row.match(/<button[^>]*class="mdp-explorer__details-toggle"[^>]*>/)[0]).not.toContain('disabled')
  })

  it('keeps Back disabled at the entry file, and omits location commands in hidden mode', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    expect(summary(render({ showBack: false }))).toMatch(/aria-label="Back to original file"[^>]*disabled=""/)
    expect(summary(render({ showBack: true }))).not.toMatch(/aria-label="Back to original file"[^>]*disabled/)
    const row = summary(render({ actionsMode: 'hidden' }))
    expect(row).not.toContain('Open folder')
    expect(row).not.toContain('Back to original file')
  })

  it('keeps folder recovery in the minimized card and avoids an extra empty-list action', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'false' })
    const html = renderToStaticMarkup(React.createElement(ToastProvider, null,
      React.createElement(FilesPanel, { explorerBridge: {} })
    ))
    expect(html).toContain('id="mdp-panel-files"><div class="mdp-explorer"')
    expect(summary(html)).toContain('aria-label="Open folder…"')
    expect(html).toContain('class="mdp-explorer__empty">No supported files found in this directory.</div>')
    expect(html).toContain('aria-label="Refresh file list"')
    expect(html).toContain('aria-label="File list controls"')
  })
})
