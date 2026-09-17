import { describe, expect, it } from 'vitest'
import { createStyleVars, getLightDarkThemeToggleTarget } from '../index.js'

describe('createStyleVars', () => {
  it('exposes toast variant colors for the light reader theme', () => {
    const vars = createStyleVars({ theme: { preset: 'light' } })

    expect(vars['--mdp-toast-success-bg']).toBe('#ecfdf5')
    expect(vars['--mdp-toast-error-text']).toBe('#b91c1c')
  })

  it('exposes distinct toast variant colors for the dark reader theme', () => {
    const lightVars = createStyleVars({ theme: { preset: 'light' } })
    const darkVars = createStyleVars({ theme: { preset: 'dark' } })

    expect(darkVars['--mdp-toast-success-bg']).toBe('#063f2c')
    expect(darkVars['--mdp-toast-success-bg']).not.toBe(lightVars['--mdp-toast-success-bg'])
    expect(darkVars['--mdp-toast-error-text']).not.toBe(lightVars['--mdp-toast-error-text'])
  })

  it('uses neutral surfaces and reserves sakura pink for emphasis', () => {
    const vars = createStyleVars({ theme: { preset: 'sakura' } })

    expect(vars['--mdp-color-scheme']).toBe('light')
    expect(vars['--mdp-bg']).toBe('#f7f2f4')
    expect(vars['--mdp-surface']).toBe('#fffafb')
    expect(vars['--mdp-panel-bg']).toBe('#f2e8ec')
    expect(vars['--mdp-link']).toBe('#983256')
    expect(vars['--mdp-link-soft']).toBe('#fbeaf0')
  })

  it('exposes a warm matcha palette with readable green emphasis', () => {
    const vars = createStyleVars({ theme: { preset: 'matcha' } })

    expect(vars['--mdp-color-scheme']).toBe('light')
    expect(vars['--mdp-bg']).toBe('#f2f4ec')
    expect(vars['--mdp-surface']).toBe('#faf8f2')
    expect(vars['--mdp-link']).toBe('#356a38')
    expect(vars['--mdp-link-soft']).toBe('#e7efe0')
  })
})

describe('getLightDarkThemeToggleTarget', () => {
  it('toggles only between the current light and dark presets', () => {
    expect(getLightDarkThemeToggleTarget('light')).toBe('dark')
    expect(getLightDarkThemeToggleTarget('dark')).toBe('light')
    expect(getLightDarkThemeToggleTarget('sakura')).toBeNull()
    expect(getLightDarkThemeToggleTarget('matcha')).toBeNull()
    expect(getLightDarkThemeToggleTarget('sepia')).toBeNull()
  })
})
