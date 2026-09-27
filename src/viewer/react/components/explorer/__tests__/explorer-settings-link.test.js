import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../contexts/ToastContext.jsx'
import { ExplorerHeader } from '../ExplorerHeader.jsx'

describe('explorer settings link', () => {
  it('renders the Settings action as inline link text', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ExplorerHeader, {
          filesContext: {},
          summaryFileCount: 0,
          depthNotice: 'Some folders were not scanned (depth limit: 4).',
          actionsMode: 'hidden',
          refreshDisabled: true
        })
      )
    )

    expect(html).toContain('Adjust scan limits in Settings')
    expect(html).toContain('class="mdp-explorer__settings-link"')
    expect(html).toContain('role="link"')
    expect(html).toContain('tabindex="0"')
    expect(html).not.toMatch(/<button[^>]*mdp-explorer__settings-link/)
    expect(html).not.toContain('chrome-extension://')
    expect(html).toContain(', then refresh.')
  })
})
