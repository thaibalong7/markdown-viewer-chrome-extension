import { describe, expect, it } from 'vitest'
import {
  getShikiThemeIdForSettings,
  SHIKI_BUNDLED_THEME_IDS
} from '../shiki-config.js'

describe('Shiki reader theme mapping', () => {
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
})
