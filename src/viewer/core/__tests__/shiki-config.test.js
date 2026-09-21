import { describe, expect, it } from 'vitest'
import {
  getShikiThemeIdForSettings,
  SHIKI_BUNDLED_THEME_IDS
} from '../shiki-config.js'
import { BUILT_IN_THEMES } from '../../../theme/index.js'

describe('Shiki reader theme mapping', () => {
  it.each([
    ['high-contrast-light', 'github-light-high-contrast'],
    ['high-contrast-dark', 'github-dark-high-contrast']
  ])('maps %s to its matching high-contrast syntax theme', (preset, shikiTheme) => {
    expect(getShikiThemeIdForSettings({ theme: { preset } })).toBe(shikiTheme)
    expect(SHIKI_BUNDLED_THEME_IDS).toContain(shikiTheme)
  })

  it('maps the sakura reader preset to its bundled light syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { preset: 'sakura' } }))
      .toBe('rose-pine-dawn')
    expect(SHIKI_BUNDLED_THEME_IDS).toContain('rose-pine-dawn')
  })

  it('maps the matcha reader preset to its bundled forest syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { preset: 'matcha' } }))
      .toBe('everforest-light')
    expect(SHIKI_BUNDLED_THEME_IDS).toContain('everforest-light')
  })

  it('maps the solarized-dark reader preset to its bundled dark syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { preset: 'solarized-dark' } }))
      .toBe('solarized-dark')
    expect(SHIKI_BUNDLED_THEME_IDS).toContain('solarized-dark')
  })

  it.each([
    ['vscode-dark', 'dark-plus'],
    ['dracula', 'dracula'],
    ['gruvbox', 'gruvbox-dark-medium'],
    ['night-owl', 'night-owl'],
    ['min-dark', 'min-dark']
  ])('maps the %s reader preset to %s', (preset, shikiTheme) => {
    expect(getShikiThemeIdForSettings({ theme: { preset } })).toBe(shikiTheme)
  })

  it('maps every built-in reader preset to a bundled Shiki theme', () => {
    for (const preset of Object.keys(BUILT_IN_THEMES)) {
      expect(SHIKI_BUNDLED_THEME_IDS).toContain(
        getShikiThemeIdForSettings({ theme: { preset } })
      )
    }
  })
})
