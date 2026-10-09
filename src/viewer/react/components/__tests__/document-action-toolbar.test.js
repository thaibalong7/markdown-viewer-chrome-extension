import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DocumentActionToolbar } from '../DocumentActionToolbar.jsx'
import { createDocumentActions } from '../document-actions-model.js'
import { ChangeReview } from '../ChangeReview.jsx'

const layout = vi.hoisted(() => ({ availableSize: 254, controlSize: 28, vertical: false }))
vi.mock('../../hooks/useDocumentActionsLayout.js', () => ({ useDocumentActionsLayout: () => layout }))

function actions() {
  return createDocumentActions({
    editorState: { enabled: false }, watchState: { available: true }, canReview: true,
    controls: { updates: React.createElement('button', { 'aria-label': 'Document updates' }), review: React.createElement('button', { 'aria-label': 'View changes' }) },
    canToggleTheme: true, themeToggleTarget: 'dark', canEdit: true, canCopyLink: false,
    canPrint: true, canExport: true,
    exportItems: [{ id: 'html', label: 'Export HTML', icon: 'export' }, { id: 'word', label: 'Export Word (.doc)', icon: 'export' }]
  })
}
const render = openMenu => renderToStaticMarkup(React.createElement(DocumentActionToolbar, { actions: actions(), visible: true, openMenu, onMenuChange: () => {} }))

describe('Direct icons composition', () => {
  it('renders three cohesive groups with at most two decorative dividers', () => {
    Object.assign(layout, { availableSize: 254, controlSize: 28 })
    const html = render(null)
    expect([...html.matchAll(/data-mdp-action="([^"]+)"/g)].map(match => match[1])).toEqual(['updates', 'theme', 'review', 'edit', 'copy', 'print', 'export'])
    expect(html.match(/class="mdp-document-actions__divider" aria-hidden="true"/g)).toHaveLength(2)
    expect(html).toContain('role="group" aria-label="Document actions"')
    expect(html).not.toMatch(/aria-label="Switch to dark theme"[^>]*aria-pressed/)
  })
  it('keeps quick controls and review direct on touch, using grouped flat overflow', () => {
    Object.assign(layout, { availableSize: 198, controlSize: 44 })
    const html = render('more')
    expect([...html.matchAll(/data-mdp-action="([^"]+)"/g)].map(match => match[1])).toEqual(['updates', 'theme', 'review', 'more'])
    expect(html.match(/class="mdp-document-actions__divider"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="More document actions" aria-haspopup="menu" aria-expanded="true" aria-controls=')
    expect(html).toContain('>Document</div>')
    expect(html).toContain('>Output</div>')
    expect(html).toContain('Export HTML')
    expect(html).toContain('Export Word (.doc)')
    expect(html).toMatch(/role="menuitem" aria-label="Copy open file link" disabled=""/)
    expect(html.match(/aria-haspopup="menu"/g)).toHaveLength(1)
  })
  it('allows the review owner to render chrome even without an available comparison', () => {
    const html = renderToStaticMarkup(React.createElement(ChangeReview, { state: { available: false }, renderTrigger: trigger => React.createElement('div', { 'data-review': Boolean(trigger) }, 'Toolbar') }))
    expect(html).toContain('data-review="false"')
    expect(html).toContain('Toolbar')
  })
})
