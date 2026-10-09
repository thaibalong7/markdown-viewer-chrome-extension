import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ExplorerSettings } from '../sections/ExplorerSettings.jsx'

describe('Files & Workspace appearance setting', () => {
  it('defaults on, displays an explicit off value and uses the immediate-save callback', () => {
    const onBehaviorChange = vi.fn()
    const render = settings => ExplorerSettings({ settings, draft: {}, fieldErrors: {}, onBehaviorChange })
    const on = renderToStaticMarkup(render({}))
    const off = renderToStaticMarkup(render({ showTreeIndentGuides: false }))
    const guideInput = html => html.match(/<input[^>]*id="explorer-show-tree-indent-guides"[^>]*>/)[0]
    expect(guideInput(on)).toContain('checked=""')
    expect(guideInput(off)).not.toContain('checked')
    const card = React.Children.toArray(render({}).props.children)[1]
    const policies = React.Children.toArray(card.props.children)[0]
    const guideRow = React.Children.toArray(policies.props.children)[0]
    const control = React.Children.toArray(guideRow.props.children)[1]
    control.props.onChange({ target: { checked: false } })
    expect(onBehaviorChange).toHaveBeenCalledExactlyOnceWith('showTreeIndentGuides', false)
  })
})
