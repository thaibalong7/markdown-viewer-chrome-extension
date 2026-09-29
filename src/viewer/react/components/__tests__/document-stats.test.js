import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DocumentStats } from '../DocumentStats.jsx'

describe('DocumentStats', () => {
  it('renders compact visual metadata with one accessible summary', () => {
    const source = Array.from({ length: 201 }, (_, index) => `word${index}`).join(' ')
    const html = renderToStaticMarkup(React.createElement(DocumentStats, { source }))

    expect(html).toContain('201 words')
    expect(html).toContain('2 min read')
    expect(html).toContain('•')
    expect(html).toContain('aria-label="Document statistics: 201 words,')
  })

  it('does not render an empty statistic row', () => {
    expect(renderToStaticMarkup(React.createElement(DocumentStats))).toBe('')
  })
})
