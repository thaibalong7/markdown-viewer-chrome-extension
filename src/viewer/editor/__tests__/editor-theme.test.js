import { describe, expect, it, vi } from 'vitest'
import { createEditorTheme } from '../editor-theme.js'
import {
  EDITOR_TOOLBAR_CONTROL_HEIGHT_PX,
  EDITOR_TOOLBAR_TOUCH_TARGET_PX
} from '../../../shared/constants/editor.js'

function captureThemeSpec() {
  const theme = vi.fn((spec) => spec)
  return {
    spec: createEditorTheme({ theme }),
    theme
  }
}

describe('editor theme', () => {
  it('anchors the search panel as a compact floating utility at the editor top-right', () => {
    const { spec, theme } = captureThemeSpec()

    expect(theme).toHaveBeenCalledOnce()
    expect(spec['.cm-panels-top']).toMatchObject({
      position: 'absolute',
      justifyContent: 'flex-end',
      padding: '8px',
      borderBottom: '0',
      pointerEvents: 'none'
    })
    expect(spec['.cm-panel.cm-search']).toMatchObject({
      rowGap: '4px',
      margin: '0',
      width: 'min(500px, 100%)',
      padding: '8px 40px 8px 8px',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '10px',
      boxShadow: 'var(--mdp-shadow-float)',
      pointerEvents: 'auto'
    })
    expect(spec['.cm-panel.cm-search .cm-textfield']).toMatchObject({
      flex: '0 1 240px',
      maxWidth: '240px',
      height: `${EDITOR_TOOLBAR_CONTROL_HEIGHT_PX}px`,
      background: 'color-mix(in srgb, var(--mdp-surface) 82%, transparent)',
      border: '1px solid var(--mdp-border-strong)',
      borderRadius: '6px'
    })
    expect(spec['.cm-panel.cm-search .cm-button']).toMatchObject({
      appearance: 'none',
      height: `${EDITOR_TOOLBAR_CONTROL_HEIGHT_PX}px`,
      background: 'var(--mdp-surface)',
      backgroundImage: 'none',
      borderRadius: '6px'
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

  it('keeps find, replace, and secondary options in deliberate rows', () => {
    const { spec } = captureThemeSpec()

    expect(spec['.cm-panel.cm-search br']).toMatchObject({
      display: 'none'
    })
    expect(spec['.cm-panel.cm-search:has(input[name="replace"])::before']).toMatchObject({
      content: '""',
      flex: '0 0 100%',
      width: '0',
      height: '0',
      order: '1'
    })
    expect(spec['.cm-panel.cm-search:has(input[name="replace"])::after']).toMatchObject({
      content: '""',
      flex: '0 0 100%',
      width: '0',
      height: '0',
      order: '3'
    })
    expect(spec['.cm-panel.cm-search :is(input[name="replace"], button[name="replace"], button[name="replaceAll"])']).toMatchObject({
      order: '2'
    })
    expect(spec['.cm-panel.cm-search label']).toMatchObject({
      order: '4',
      background: 'transparent'
    })
  })

  it('restores accessible targets for coarse pointers', () => {
    const { spec } = captureThemeSpec()
    const coarsePointer = spec['@media (pointer: coarse)']

    expect(coarsePointer['.cm-panel.cm-search :is(.cm-textfield, .cm-button, label)']).toMatchObject({
      height: `${EDITOR_TOOLBAR_TOUCH_TARGET_PX}px`
    })
    expect(coarsePointer['.cm-panel.cm-search button[name="close"]']).toMatchObject({
      width: `${EDITOR_TOOLBAR_TOUCH_TARGET_PX}px`,
      height: `${EDITOR_TOOLBAR_TOUCH_TARGET_PX}px`
    })
  })
})
