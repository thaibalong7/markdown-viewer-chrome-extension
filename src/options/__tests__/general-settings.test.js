import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GeneralSettings } from '../sections/GeneralSettings.jsx'

function render(settings = {}, saving = false) {
  return renderToStaticMarkup(React.createElement(GeneralSettings, { settings, saving }))
}

describe('General document update settings', () => {
  it('uses the shared select with an associated label and explanation', () => {
    const html = render()
    expect(html).toContain('for="general-watch-mode"')
    expect(html).toContain('id="general-watch-mode" class="mdp-ui-select" aria-describedby="general-watch-description"')
    expect(html).toContain('id="general-watch-description"')
    expect(html).toContain('<option value="ask" selected="">')
  })

  it.each(['ask', 'auto', 'off'])('retains the persisted %s mode', (mode) => {
    expect(render({ watch: { mode } })).toContain(`<option value="${mode}" selected="">`)
  })

  it('disables the select while saving', () => {
    expect(render({}, true)).toMatch(/<select[^>]*disabled=""/)
  })
})
