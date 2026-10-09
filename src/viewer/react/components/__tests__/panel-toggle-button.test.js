import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelToggleButton } from '../PanelToggleButton.jsx'

describe('Porcelain #22 panel toggles', () => {
  it.each([
    ['files', true, -1, 'm15 6-6 6 6 6'], ['files', false, 1, 'm9 6 6 6-6 6'],
    ['outline', true, 1, 'm9 6 6 6-6 6'], ['outline', false, -1, 'm15 6-6 6 6 6']
  ])('mirrors %s expanded=%s while retaining its accessible control contract', (panel, expanded, direction, path) => {
    const html = renderToStaticMarkup(React.createElement(PanelToggleButton, {
      panel, expanded, controls: `mdp-panel-${panel}`
    }))
    expect(html).toContain(`aria-expanded="${expanded}"`)
    expect(html).toContain(`aria-controls="mdp-panel-${panel}"`)
    expect(html).toContain(`aria-label="${expanded ? 'Hide' : 'Show'} ${panel === 'files' ? 'Files' : 'Outline'} panel"`)
    expect(html).toContain(`--mdp-toggle-direction:${direction}`)
    expect(html).toContain(`d="${path}"`)
    expect(html).toContain('viewBox="3 0 18 24"')
    expect(html).toContain('mdp-panel-toggle__face')
    expect(html).not.toContain('aria-pressed')
  })
})
