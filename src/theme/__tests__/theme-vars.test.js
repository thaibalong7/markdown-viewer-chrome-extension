import { describe, expect, it } from 'vitest'
import { BUILT_IN_THEMES, createStyleVars, getLightDarkThemeToggleTarget } from '../index.js'

function getContrastRatio(foreground, background) {
  const getLuminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16) / 255)
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
  }

  const foregroundLuminance = getLuminance(foreground)
  const backgroundLuminance = getLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

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

  it('exposes theme-specific panel toggle styling', () => {
    const lightVars = createStyleVars({ theme: { preset: 'light' } })
    const darkVars = createStyleVars({ theme: { preset: 'dark' } })

    expect(lightVars['--mdp-panel-toggle-bg']).toBe('#edf3fc')
    expect(lightVars['--mdp-panel-toggle-text']).toBe('#58709a')
    expect(lightVars['--mdp-panel-toggle-shadow']).toContain('rgb(23 32 51')
    expect(darkVars['--mdp-panel-toggle-bg']).toBe('#1d2735')
    expect(darkVars['--mdp-panel-toggle-text']).toBe('#9ba9bb')
    expect(darkVars['--mdp-panel-toggle-hover-bg'])
      .not.toBe(lightVars['--mdp-panel-toggle-hover-bg'])
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

  it('exposes a deep teal solarized dark palette with high legibility', () => {
    const vars = createStyleVars({ theme: { preset: 'solarized-dark' } })

    expect(vars['--mdp-color-scheme']).toBe('dark')
    expect(vars['--mdp-bg']).toBe('#002b36')
    expect(vars['--mdp-surface']).toBe('#073642')
    expect(vars['--mdp-heading']).toBe('#eee8d5')
    expect(vars['--mdp-link']).toBe('#2e9fe6')
    expect(vars['--mdp-link-soft']).toBe('#073c48')
  })

  it.each([
    ['vscode-dark', '#181818', '#4daafc'],
    ['dracula', '#282a36', '#8be9fd'],
    ['gruvbox', '#282828', '#83a598'],
    ['night-owl', '#011627', '#82aaff'],
    ['min-dark', '#171717', '#9cb6d6']
  ])('exposes the %s dark reader palette', (preset, background, link) => {
    const vars = createStyleVars({ theme: { preset } })

    expect(vars['--mdp-color-scheme']).toBe('dark')
    expect(vars['--mdp-bg']).toBe(background)
    expect(vars['--mdp-link']).toBe(link)
    expect(getContrastRatio(vars['--mdp-body-text'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio(vars['--mdp-link'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio(vars['--mdp-toast-info-text'], vars['--mdp-toast-info-bg']))
      .toBeGreaterThanOrEqual(4.5)
  })
})

describe('getLightDarkThemeToggleTarget', () => {
  it('toggles only between the current light and dark presets', () => {
    expect(getLightDarkThemeToggleTarget('light')).toBe('dark')
    expect(getLightDarkThemeToggleTarget('dark')).toBe('light')
    for (const preset of Object.keys(BUILT_IN_THEMES)) {
      if (preset !== 'light' && preset !== 'dark') {
        expect(getLightDarkThemeToggleTarget(preset)).toBeNull()
      }
    }
    expect(getLightDarkThemeToggleTarget('sepia')).toBeNull()
  })
})
