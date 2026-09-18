import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SettingsTabIcon } from '../components/SettingsTabIcon.jsx'
import { EditorSettingsPanel } from '../panels/EditorSettingsPanel.jsx'
import { FileHistoryPanel } from '../panels/FileHistoryPanel.jsx'
import { PluginsPanel } from '../panels/PluginsPanel.jsx'
import { ReaderPanel } from '../panels/ReaderPanel.jsx'

const noop = () => {}

describe('popup shared primitives', () => {
  it('composes shared fields, switches, and buttons in quick settings panels', () => {
    const readerHtml = renderToStaticMarkup(
      React.createElement(ReaderPanel, {
        settings: {
          theme: { preset: 'light' },
          typography: { fontSize: 16, lineHeight: 1.7 },
          layout: { contentMaxWidth: 980, showToc: true }
        },
        onPatch: noop
      })
    )
    const editorHtml = renderToStaticMarkup(
      React.createElement(EditorSettingsPanel, { settings: {}, onPatch: noop })
    )
    const pluginsHtml = renderToStaticMarkup(
      React.createElement(PluginsPanel, {
        pluginsSnapshot: { mermaid: { enabled: true, renderer: 'official' } },
        onPatch: noop
      })
    )

    expect(readerHtml).toContain('mdp-ui-select')
    expect(readerHtml).toContain('mdp-ui-number-field')
    expect(readerHtml).toContain('mdp-ui-field__label-row')
    expect(readerHtml).toContain('About line height')
    expect(readerHtml).toContain('mdp-ui-switch__track')
    expect(readerHtml).toContain('mdp-ui-button--danger')
    expect(editorHtml).toContain('mdp-ui-number-field')
    expect(editorHtml).toContain('mdp-ui-switch__track')
    expect(pluginsHtml).toContain('mdp-ui-switch__track')
    expect(pluginsHtml).toContain('popup-plugin-note')
    expect(pluginsHtml).toContain('popup-mermaid-renderers')
    expect(pluginsHtml).toContain('type="radio"')
    expect(pluginsHtml).toContain('Broadest Mermaid syntax support and the safest default.')
    expect(pluginsHtml).toContain('Official')
    expect(pluginsHtml).toContain('Beautiful')
    expect(pluginsHtml).not.toContain('mdp-ui-select')
  })

  it('only reveals Mermaid renderer choices while the plugin is enabled', () => {
    const pluginsHtml = renderToStaticMarkup(
      React.createElement(PluginsPanel, {
        pluginsSnapshot: { mermaid: { enabled: false, renderer: 'official' } },
        onPatch: noop
      })
    )

    expect(pluginsHtml).not.toContain('popup-mermaid-renderers')
  })

  it('uses shared loading and empty-state contracts for recent files', () => {
    const loadingHtml = renderToStaticMarkup(
      React.createElement(FileHistoryPanel, {
        history: [],
        loading: true,
        busyUrl: '',
        errorMessage: '',
        onOpen: noop,
        onClear: noop
      })
    )
    const emptyHtml = renderToStaticMarkup(
      React.createElement(FileHistoryPanel, {
        history: [],
        loading: false,
        busyUrl: '',
        errorMessage: '',
        onOpen: noop,
        onClear: noop
      })
    )

    expect(loadingHtml).toContain('mdp-ui-loading-state')
    expect(emptyHtml).toContain('mdp-ui-state')
    expect(emptyHtml).toContain('mdp-ui-state__title')
  })

  it('renders navigation icons as accessible-hidden stroke SVGs', () => {
    const html = renderToStaticMarkup(React.createElement(SettingsTabIcon, { name: 'reader' }))

    expect(html).toContain('<svg')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('📖')
  })
})
