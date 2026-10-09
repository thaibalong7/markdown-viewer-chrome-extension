import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RightRail } from '../RightRail.jsx'

describe('RightRail actions row', () => {
  it('groups document actions in a dedicated utility row', () => {
    const html = renderToStaticMarkup(
      React.createElement(RightRail, {
        actions: React.createElement('div', { className: 'mdp-floating-actions' }, 'Commands'),
        outlineAvailable: false,
        outlineExpanded: false,
        settings: {},
        tocItems: [],
        tocReady: true
      })
    )

    expect(html).toMatch(
      /mdp-right-rail__actions-row[\s\S]*mdp-floating-actions/
    )
    expect(html).not.toContain('mdp-right-rail__actions-label')
    expect(html).not.toContain('>Actions</span>')
  })

  it('places Outline after commands in the first row and summary in the second', () => {
    const html = renderToStaticMarkup(React.createElement(RightRail, {
      actions: React.createElement('div', { className: 'mdp-floating-actions' }, 'Commands'),
      outlineAvailable: true, outlineExpanded: true, settings: {}, tocItems: [], tocReady: true
    }))
    expect(html).toMatch(/mdp-panel-toggle--outline[\s\S]*mdp-right-rail__actions-row[\s\S]*mdp-right-rail__commands[\s\S]*mdp-right-rail__title[\s\S]*mdp-outline__header/)
    expect(html).toContain('aria-label="Hide Outline panel"')
    expect(html).toContain('<span>On this page</span>')
    expect(html).toContain('0 headings')
    expect(html).not.toContain('mdp-panel-header__heading')
    expect(html).not.toContain('mdp-right-rail__restore')
    expect(html).not.toContain('mdp-panel-toggle--inline')
    expect(html).not.toContain('inert=""')
  })

  it('keeps Show on the same edge and makes the retained Outline inert when hidden', () => {
    const html = renderToStaticMarkup(React.createElement(RightRail, {
      actions: React.createElement('div', { className: 'mdp-floating-actions' }, 'Commands'),
      outlineAvailable: true, outlineExpanded: false, settings: {}, tocItems: [], tocReady: true
    }))
    expect(html).toMatch(/Show Outline panel[\s\S]*mdp-panel-toggle--outline[\s\S]*mdp-right-rail__actions-row/)
    expect(html).not.toContain('mdp-right-rail__restore')
    expect(html).toContain('mdp-right-rail--outline-collapsed')
    expect(html).toMatch(/mdp-right-rail__outline-clip" aria-hidden="true" inert=""/)
    expect(html.match(/mdp-panel-toggle--outline/g)).toHaveLength(1)
    expect(html).not.toContain('mdp-right-rail__title')
  })
})
