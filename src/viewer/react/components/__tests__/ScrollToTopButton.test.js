import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScrollToTopButton, shouldShowScrollToTop } from '../ScrollToTopButton.jsx'

describe('ScrollToTopButton', () => {
  it('reveals only after a meaningful scroll distance in an overflowing pane', () => {
    expect(shouldShowScrollToTop({
      scrollTop: 479,
      scrollHeight: 2400,
      clientHeight: 800
    })).toBe(false)
    expect(shouldShowScrollToTop({
      scrollTop: 480,
      scrollHeight: 2400,
      clientHeight: 800
    })).toBe(true)
  })

  it('stays hidden when content does not overflow or the scroll is still near the top', () => {
    expect(shouldShowScrollToTop({
      scrollTop: 500,
      scrollHeight: 800,
      clientHeight: 800
    })).toBe(false)
    expect(shouldShowScrollToTop({
      scrollTop: 319,
      scrollHeight: 1200,
      clientHeight: 400
    })).toBe(false)
  })

  it('renders an initially hidden, non-tabbable accessible control', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScrollToTopButton, { scrollElement: null })
    )

    expect(html).toContain('aria-label="Back to top"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('mdp-scroll-to-top')
  })
})
