import { describe, expect, it } from 'vitest'
import { getShikiThemeIdForSettings } from '../shiki-config.js'
import {
  BUILT_IN_THEMES,
  BUNDLED_SYNTAX_THEME_IDS
} from '../../../theme/index.js'

describe('Shiki reader theme mapping', () => {
  it('ships the curated set of 30 selectable syntax themes', () => {
    expect(BUNDLED_SYNTAX_THEME_IDS).toHaveLength(30)
    expect(new Set(BUNDLED_SYNTAX_THEME_IDS).size).toBe(30)
  })

  it.each([
    ['high-contrast-light', 'github-light-high-contrast'],
    ['high-contrast-dark', 'github-dark-high-contrast']
  ])('maps %s to its matching high-contrast syntax theme', (preset, shikiTheme) => {
    expect(getShikiThemeIdForSettings({ theme: { activeId: preset, customThemes: [] } })).toBe(shikiTheme)
    expect(BUNDLED_SYNTAX_THEME_IDS).toContain(shikiTheme)
  })

  it('maps the sakura reader preset to its bundled light syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { activeId: 'sakura', customThemes: [] } }))
      .toBe('rose-pine-dawn')
    expect(BUNDLED_SYNTAX_THEME_IDS).toContain('rose-pine-dawn')
  })

  it('maps the matcha reader preset to its bundled forest syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { activeId: 'matcha', customThemes: [] } }))
      .toBe('everforest-light')
    expect(BUNDLED_SYNTAX_THEME_IDS).toContain('everforest-light')
  })

  it('maps the solarized-dark reader preset to its bundled dark syntax theme', () => {
    expect(getShikiThemeIdForSettings({ theme: { activeId: 'solarized-dark', customThemes: [] } }))
      .toBe('solarized-dark')
    expect(BUNDLED_SYNTAX_THEME_IDS).toContain('solarized-dark')
  })

  it.each([
    ['vscode-dark', 'dark-plus'],
    ['dracula', 'dracula'],
    ['gruvbox', 'gruvbox-dark-medium'],
    ['night-owl', 'night-owl'],
    ['min-dark', 'min-dark']
  ])('maps the %s reader preset to %s', (preset, shikiTheme) => {
    expect(getShikiThemeIdForSettings({ theme: { activeId: preset, customThemes: [] } })).toBe(shikiTheme)
  })

  it('maps every built-in reader preset to a bundled Shiki theme', () => {
    for (const preset of Object.keys(BUILT_IN_THEMES)) {
      expect(BUNDLED_SYNTAX_THEME_IDS).toContain(
        getShikiThemeIdForSettings({ theme: { activeId: preset, customThemes: [] } })
      )
    }
  })

  it('allows a custom theme to override the Shiki theme independently from its base', () => {
    expect(getShikiThemeIdForSettings({
      theme: {
        activeId: 'custom:midnight-1234',
        customThemes: [{
          id: 'custom:midnight-1234',
          name: 'Midnight',
          baseId: 'dark',
          syntaxThemeId: 'dracula',
          colors: {},
          background: { type: 'none' }
        }]
      }
    })).toBe('dracula')
  })

  it('keeps following the base mapping when a custom theme has no override', () => {
    expect(getShikiThemeIdForSettings({
      theme: {
        activeId: 'custom:midnight-1234',
        customThemes: [{
          id: 'custom:midnight-1234',
          name: 'Midnight',
          baseId: 'dark',
          syntaxThemeId: null,
          colors: {},
          background: { type: 'none' }
        }]
      }
    })).toBe('github-dark')
  })
})
