import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ExitEditConfirmation } from '../ExitEditConfirmation.jsx'

it('names the destructive action and uses shared theme-aware controls with accessible copy', () => {
  const html = renderToStaticMarkup(React.createElement(ExitEditConfirmation, {
    open: true, onCancel: vi.fn(), onConfirm: vi.fn()
  }))
  expect(html).toContain('<dialog')
  expect(html).toContain('role="alertdialog"')
  expect(html).toContain('aria-modal="true"')
  const titleId = html.match(/aria-labelledby="([^"]+)"/)[1]
  const descriptionId = html.match(/aria-describedby="([^"]+)"/)[1]
  expect(html).toContain(`<h2 id="${titleId}">Discard changes and exit edit mode?</h2>`)
  expect(html).toContain(`<p id="${descriptionId}">`)
  expect(html).toContain('The saved file will stay unchanged.')
  expect(html).toContain('mdp-ui-card')
  expect(html).toContain('mdp-ui-action-footer')
  expect(html).toContain('mdp-ui-badge--warning')
  expect(html).toContain('mdp-ui-button--danger')
  expect(html).toContain('Keep editing')
  expect(html).toContain('Discard changes')
})

it('renders nothing while closed and prevents discarding during a save', () => {
  expect(renderToStaticMarkup(React.createElement(ExitEditConfirmation, { open: false }))).toBe('')
  const html = renderToStaticMarkup(React.createElement(ExitEditConfirmation, { open: true, busy: true }))
  expect(html).toMatch(/<button[^>]*mdp-ui-button--danger[^>]*disabled=""/)
  expect(html).not.toMatch(/<button[^>]*mdp-ui-button--secondary[^>]*disabled=""/)
})
