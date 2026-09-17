import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Badge } from '../Badge.jsx'
import { Button } from '../Button.jsx'
import { Notice } from '../Notice.jsx'
import { NumberField } from '../NumberField.jsx'
import { Switch } from '../Switch.jsx'

describe('shared application primitives', () => {
  it('exposes busy button state without dropping its accessible label', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        Button,
        { variant: 'primary', busy: true, busyLabel: 'Saving settings…' },
        'Save changes'
      )
    )

    expect(html).toContain('mdp-ui-button--primary')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('Saving settings…')
    expect(html).toContain('mdp-ui-spinner')
  })

  it('associates number-field help and validation with the input', () => {
    const html = renderToStaticMarkup(
      React.createElement(NumberField, {
        id: 'max-files',
        label: 'Maximum files',
        helper: 'Files indexed during a scan.',
        error: 'Enter a value from 10 to 20,000.',
        rangeLabel: '10–20,000',
        value: '0',
        readOnly: true
      })
    )

    expect(html).toContain('for="max-files"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="max-files-helper max-files-error"')
  })

  it('renders a labelled native switch and semantic feedback variants', () => {
    const switchHtml = renderToStaticMarkup(
      React.createElement(Switch, {
        id: 'enabled',
        label: 'Enable Markdown Plus',
        checked: true,
        readOnly: true
      })
    )
    const feedbackHtml = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Badge, { variant: 'success' }, 'Allowed'),
        React.createElement(
          Notice,
          { variant: 'warning', title: 'Large scan' },
          'Higher limits use more memory.'
        )
      )
    )

    expect(switchHtml).toContain('type="checkbox"')
    expect(switchHtml).toContain('Enable Markdown Plus')
    expect(switchHtml).toContain('mdp-ui-switch__track')
    expect(feedbackHtml).toContain('mdp-ui-badge--success')
    expect(feedbackHtml).toContain('mdp-ui-notice--warning')
  })
})
