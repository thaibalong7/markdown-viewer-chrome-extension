import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ThemeEditor } from '../sections/ThemeEditor.jsx'
import { ThemeSettings } from '../sections/ThemeSettings.jsx'

const customTheme = {
  id: 'custom:midnight-1234',
  name: 'Midnight',
  baseId: 'dark',
  colors: {
    background: '#101827',
    surface: '#172033',
    panelBg: '#111827',
    text: '#f8fafc',
    bodyText: '#e2e8f0',
    heading: '#ffffff',
    muted: '#94a3b8',
    border: '#334155',
    codeBg: '#0f172a',
    codeText: '#e2e8f0',
    link: '#67e8f9',
    accent: '#c4b5fd'
  },
  background: {
    type: 'gradient',
    startColor: '#101827',
    endColor: '#312e81',
    angle: 135,
    motion: 'system',
    overlayOpacity: 0.1
  }
}

describe('custom theme settings', () => {
  it('keeps the Themes tab focused on selecting and managing saved themes', () => {
    const html = renderToStaticMarkup(
      React.createElement(ThemeSettings, {
        settings: {
          theme: { activeId: customTheme.id, customThemes: [customTheme] }
        },
        busyAction: '',
        onActiveThemeChange: () => {},
        onSaveTheme: async () => null,
        onDeleteTheme: async () => null
      })
    )

    expect(html).toContain('Choose the reader theme in use')
    expect(html).toContain('Active reader theme')
    expect(html).toContain('My themes')
    expect(html).toContain('Midnight')
    expect(html).toContain('Base: Dark')
    expect(html).toContain('Gradient background')
    expect(html).toContain('Edit')
    expect(html).toContain('Delete')
    expect(html).toContain('background-color:#101827')
    expect(html).toContain('background-color:#172033')
    expect(html).toContain('background-color:#67e8f9')
    expect(html).toContain('background-color:#c4b5fd')
    expect(html).not.toContain('Background type')
    expect(html).not.toContain('Live preview')
  })

  it('puts all authoring controls and the live preview in the dedicated editor', () => {
    const html = renderToStaticMarkup(
      React.createElement(ThemeEditor, {
        settings: {
          theme: { activeId: customTheme.id, customThemes: [customTheme] }
        },
        initialTheme: customTheme,
        busyAction: '',
        onCancel: () => {},
        onSave: async () => null
      })
    )

    expect(html).toContain('Back to themes')
    expect(html).toContain('Edit Midnight')
    expect(html).toContain('value="Midnight"')
    expect(html).toContain('8 / 48')
    expect(html).toContain('Shown in the theme picker and popup.')
    expect(html).toContain('Resets colors')
    expect(html).toContain('Code highlighting follows this base unless overridden below.')
    expect(html).toContain('Inline/fallback code background')
    expect(html).toContain('Inline/fallback code text')
    expect(html).toContain('Inline/fallback code colors do not replace the rendered syntax theme in section 03.')
    expect(html).toContain('Code highlighting')
    expect(html).toContain('Rendered code theme')
    expect(html).toContain('Follow base theme (GitHub Dark)')
    expect(html).toContain('Light themes')
    expect(html).toContain('Dark themes')
    expect(html).toContain('Catppuccin Latte')
    expect(html).toContain('One Dark Pro')
    expect(html).toContain('The Markdown editor keeps its own highlighting.')
    expect(html).toContain('Code: GitHub Dark')
    expect(html).toContain('settings-theme-preview__code-copy')
    expect(html).not.toContain('JavaScript · GitHub Dark')
    expect(html).toContain('background-color:#0d121b')
    expect(html).toContain('background-color:#151b26')
    expect(html).toContain('Background type')
    expect(html).toContain('Gradient')
    expect(html).toContain('Start color')
    expect(html).toContain('Dimming (0–0.8)')
    expect(html).toContain('Live preview')
    expect(html).toContain('Every valid change appears here instantly.')
    expect(html).toContain('Files')
    expect(html).toContain('Outline')
    expect(html).toContain('--mdp-heading:#ffffff')
    expect(html).toContain('linear-gradient(135deg, #101827, #312e81)')
  })

  it('shows an explicit code highlighting override in the live preview', () => {
    const overriddenTheme = { ...customTheme, syntaxThemeId: 'dracula' }
    const html = renderToStaticMarkup(
      React.createElement(ThemeEditor, {
        settings: {
          theme: { activeId: overriddenTheme.id, customThemes: [overriddenTheme] }
        },
        initialTheme: overriddenTheme,
        busyAction: '',
        onCancel: () => {},
        onSave: async () => null
      })
    )

    expect(html).toContain('Code: Dracula')
  })

  it('shows an empty library state before a custom theme exists', () => {
    const html = renderToStaticMarkup(
      React.createElement(ThemeSettings, {
        settings: {
          theme: { activeId: 'dark', customThemes: [] }
        },
        busyAction: '',
        onActiveThemeChange: () => {},
        onSaveTheme: async () => null,
        onDeleteTheme: async () => null
      })
    )

    expect(html).toContain('No custom themes yet')
    expect(html).toContain('Create your first theme')
    expect(html).not.toContain('aria-label="Live theme preview"')
  })
})
