import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LoadingState } from '../LoadingState.jsx'

describe('shared async-state primitives', () => {
  it('renders one accessible loading label with a decorative spinner', () => {
    const html = renderToStaticMarkup(
      React.createElement(LoadingState, { label: 'Loading editor…' })
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('class="mdp-ui-spinner"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Loading editor…')
  })

})
