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
      /mdp-right-rail__actions-row[\s\S]*mdp-right-rail__actions-label[\s\S]*mdp-floating-actions/
    )
    expect(html).toContain('>Actions</span>')
  })
})
