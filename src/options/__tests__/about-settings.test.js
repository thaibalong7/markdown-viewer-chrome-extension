import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AboutSettings } from '../sections/AboutSettings.jsx'

describe('About Settings section', () => {
  it('shows extension identity, local-first guidance, and safe external links', () => {
    const html = renderToStaticMarkup(
      React.createElement(AboutSettings, {
        metadata: {
          version: '1.2.3',
          manifestLabel: 'Manifest V3',
          minimumChromeLabel: 'Chrome 109+'
        }
      })
    )

    expect(html).toContain('About Markdown Plus')
    expect(html).toContain('Version 1.2.3')
    expect(html).toContain('Local-first by design')
    expect(html).toContain('What Markdown Plus does')
    expect(html).toContain('Project &amp; support')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
  })
})
