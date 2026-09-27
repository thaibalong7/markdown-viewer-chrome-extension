import { describe, expect, it, vi } from 'vitest'
import { createEditorTheme } from '../editor-theme.js'

function captureThemeSpec() {
  const theme = vi.fn((spec) => spec)
  return {
    spec: createEditorTheme({ theme }),
    theme
  }
}

describe('editor theme', () => {
  it('styles the search panel with application design tokens', () => {
    const { spec, theme } = captureThemeSpec()

    expect(theme).toHaveBeenCalledOnce()
    expect(spec['.cm-panel.cm-search']).toMatchObject({
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '12px',
      boxShadow: 'var(--mdp-shadow-raised)'
    })
    expect(spec['.cm-panel.cm-search .cm-textfield']).toMatchObject({
      background: 'var(--mdp-surface)',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '8px'
    })
    expect(spec['.cm-panel.cm-search .cm-button']).toMatchObject({
      appearance: 'none',
      background: 'var(--mdp-surface)',
      backgroundImage: 'none',
      borderRadius: '8px'
    })
  })

  it('keeps search controls keyboard-visible and theme-aware', () => {
    const { spec } = captureThemeSpec()

    expect(spec['.cm-panel.cm-search .cm-textfield:focus-visible']).toMatchObject({
      borderColor: 'var(--mdp-link)',
      outline: 'none'
    })
    expect(spec['.cm-panel.cm-search .cm-button:focus-visible']).toMatchObject({
      outline: '2px solid var(--mdp-focus-color)'
    })
    expect(spec['.cm-panel.cm-search input[type="checkbox"]:checked']).toMatchObject({
      borderColor: 'var(--mdp-link)',
      backgroundColor: 'var(--mdp-link)'
    })
  })

  it('uses the search panel line break to separate find and replace controls', () => {
    const { spec } = captureThemeSpec()

    expect(spec['.cm-panel.cm-search br']).toMatchObject({
      display: 'block',
      flex: '0 0 100%'
    })
  })
})
