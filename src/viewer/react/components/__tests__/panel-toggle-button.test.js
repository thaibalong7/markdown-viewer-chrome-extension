import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelToggleButton } from '../PanelToggleButton.jsx'

function renderToggle(props) {
  return renderToStaticMarkup(
    React.createElement(PanelToggleButton, { ...props, onClick: () => {} })
  )
}

describe('PanelToggleButton', () => {
  it('exposes the Files panel state and target', () => {
    const expanded = renderToggle({
      panel: 'files',
      expanded: true,
      controls: 'mdp-panel-files'
    })
    const collapsed = renderToggle({
      panel: 'files',
      expanded: false,
      controls: 'mdp-panel-files'
    })

    expect(expanded).toContain('aria-label="Hide Files panel"')
    expect(expanded).toContain('aria-expanded="true"')
    expect(expanded).toContain('aria-controls="mdp-panel-files"')
    expect(collapsed).toContain('aria-label="Show Files panel"')
    expect(collapsed).toContain('aria-expanded="false"')
  })

  it('exposes the Outline panel state and target', () => {
    const html = renderToggle({
      panel: 'outline',
      expanded: false,
      controls: 'mdp-panel-outline'
    })

    expect(html).toContain('aria-label="Show Outline panel"')
    expect(html).toContain('aria-controls="mdp-panel-outline"')
    expect(html).toContain('mdp-panel-toggle--outline')
  })
})
