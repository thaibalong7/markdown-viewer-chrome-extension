import { describe, expect, it } from 'vitest'
import {
  BUILT_IN_THEMES,
  BUILT_IN_THEME_DEFINITIONS,
  createCustomThemeDraft,
  createStyleVars,
  getBuiltInThemeBackground,
  getLightDarkThemeToggleTarget,
  rebaseCustomThemeDraft
} from '../index.js'

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
  it('models every built-in theme as colors plus its own background descriptor', () => {
    for (const [id, definition] of Object.entries(BUILT_IN_THEME_DEFINITIONS)) {
      expect(definition.colors).toEqual(BUILT_IN_THEMES[id])
      expect(definition.background).toHaveProperty('type')
    }
  })

  it('resolves colors from the active saved custom theme', () => {
    const settings = {
      theme: {
        activeId: 'custom:midnight-1234',
        customThemes: [{
          id: 'custom:midnight-1234',
          name: 'Midnight',
          baseId: 'dark',
          colors: { background: '#101827', link: '#67e8f9' },
          background: { type: 'none' }
        }]
      }
    }

    const vars = createStyleVars(settings)

    expect(vars['--mdp-color-scheme']).toBe('dark')
    expect(vars['--mdp-bg']).toBe('#101827')
    expect(vars['--mdp-link']).toBe('#67e8f9')
    expect(vars['--mdp-surface']).toBe(BUILT_IN_THEMES.dark.surface)
  })

  it('exposes toast variant colors for the light reader theme', () => {
    const vars = createStyleVars({ theme: { activeId: 'light', customThemes: [] } })

    expect(vars['--mdp-toast-success-bg']).toBe('#ecfdf5')
    expect(vars['--mdp-toast-error-text']).toBe('#b91c1c')
  })

  it('exposes distinct toast variant colors for the dark reader theme', () => {
    const lightVars = createStyleVars({ theme: { activeId: 'light', customThemes: [] } })
    const darkVars = createStyleVars({ theme: { activeId: 'dark', customThemes: [] } })

    expect(darkVars['--mdp-toast-success-bg']).toBe('#063f2c')
    expect(darkVars['--mdp-toast-success-bg']).not.toBe(lightVars['--mdp-toast-success-bg'])
    expect(darkVars['--mdp-toast-error-text']).not.toBe(lightVars['--mdp-toast-error-text'])
  })

  it.each([
    ['high-contrast-light', 'light', '#ffffff', '#003b8f'],
    ['high-contrast-dark', 'dark', '#000000', '#75baff']
  ])('exposes an accessible %s palette', (preset, colorScheme, background, link) => {
    const vars = createStyleVars({ theme: { activeId: preset, customThemes: [] } })

    expect(vars['--mdp-color-scheme']).toBe(colorScheme)
    expect(vars['--mdp-bg']).toBe(background)
    expect(vars['--mdp-link']).toBe(link)
    expect(getContrastRatio(vars['--mdp-body-text'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(7)
    expect(getContrastRatio(vars['--mdp-link'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(7)
    expect(getContrastRatio(vars['--mdp-muted'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(7)
    expect(getContrastRatio(vars['--mdp-border'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(3)
    for (const variant of ['info', 'success', 'warning', 'error']) {
      expect(getContrastRatio(
        vars[`--mdp-toast-${variant}-text`],
        vars[`--mdp-toast-${variant}-bg`]
      )).toBeGreaterThanOrEqual(7)
    }
  })

  it('exposes theme-specific panel toggle styling', () => {
    const lightVars = createStyleVars({ theme: { activeId: 'light', customThemes: [] } })
    const darkVars = createStyleVars({ theme: { activeId: 'dark', customThemes: [] } })

    expect(lightVars['--mdp-panel-toggle-bg']).toBe('#edf3fc')
    expect(lightVars['--mdp-panel-toggle-text']).toBe('#58709a')
    expect(lightVars['--mdp-panel-toggle-shadow']).toContain('rgb(23 32 51')
    expect(darkVars['--mdp-panel-toggle-bg']).toBe('#1d2735')
    expect(darkVars['--mdp-panel-toggle-text']).toBe('#9ba9bb')
    expect(darkVars['--mdp-panel-toggle-hover-bg'])
      .not.toBe(lightVars['--mdp-panel-toggle-hover-bg'])
  })

  it('uses neutral surfaces and reserves sakura pink for emphasis', () => {
    const vars = createStyleVars({ theme: { activeId: 'sakura', customThemes: [] } })

    expect(vars['--mdp-color-scheme']).toBe('light')
    expect(vars['--mdp-bg']).toBe('#f7f2f4')
    expect(vars['--mdp-surface']).toBe('#fffafb')
    expect(vars['--mdp-panel-bg']).toBe('#f2e8ec')
    expect(vars['--mdp-link']).toBe('#983256')
    expect(vars['--mdp-link-soft']).toBe('#fbeaf0')
  })

  it('exposes a warm matcha palette with readable green emphasis', () => {
    const vars = createStyleVars({ theme: { activeId: 'matcha', customThemes: [] } })

    expect(vars['--mdp-color-scheme']).toBe('light')
    expect(vars['--mdp-bg']).toBe('#f2f4ec')
    expect(vars['--mdp-surface']).toBe('#faf8f2')
    expect(vars['--mdp-link']).toBe('#356a38')
    expect(vars['--mdp-link-soft']).toBe('#e7efe0')
  })

  it('exposes a deep teal solarized dark palette with high legibility', () => {
    const vars = createStyleVars({ theme: { activeId: 'solarized-dark', customThemes: [] } })

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
    ['min-dark', '#171717', '#9cb6d6'],
    ['aurora-glass', '#0b1020', '#67e8f9']
  ])('exposes the %s dark reader palette', (preset, background, link) => {
    const vars = createStyleVars({ theme: { activeId: preset, customThemes: [] } })

    expect(vars['--mdp-color-scheme']).toBe('dark')
    expect(vars['--mdp-bg']).toBe(background)
    expect(vars['--mdp-link']).toBe(link)
    expect(getContrastRatio(vars['--mdp-body-text'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio(vars['--mdp-link'], vars['--mdp-bg'])).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio(vars['--mdp-toast-info-text'], vars['--mdp-toast-info-bg']))
      .toBeGreaterThanOrEqual(4.5)
  })

  it('exposes Aurora Glass as a dark palette with a visual background preset', () => {
    const vars = createStyleVars({ theme: { activeId: 'aurora-glass', customThemes: [] } })

    expect(getBuiltInThemeBackground('aurora-glass')).toMatchObject({
      type: 'gradient',
      variant: 'aurora'
    })
    expect(vars['--mdp-color-scheme']).toBe('dark')
    expect(vars['--mdp-bg']).toBe('#0b1020')
    expect(vars['--mdp-viewer-background']).toBe('#0b1020')
    expect(vars['--mdp-link']).toBe('#67e8f9')
    expect(vars['--mdp-scrollbar-thumb'])
      .toBe('color-mix(in srgb, var(--mdp-muted) 32%, transparent)')
    expect(vars['--mdp-scrollbar-thumb-hover'])
      .toBe('color-mix(in srgb, var(--mdp-muted) 52%, transparent)')
  })

  it.each(Object.keys(BUILT_IN_THEMES))('exposes consistent scrollbar colors for %s', (preset) => {
    const vars = createStyleVars({ theme: { activeId: preset, customThemes: [] } })
    const theme = BUILT_IN_THEMES[preset]

    expect(vars['--mdp-scrollbar-thumb']).toBe(
      theme.scrollbarThumb || 'color-mix(in srgb, var(--mdp-muted) 32%, transparent)'
    )
    expect(vars['--mdp-scrollbar-thumb-hover']).toBe(
      theme.scrollbarThumbHover || 'color-mix(in srgb, var(--mdp-muted) 52%, transparent)'
    )
  })

  it.each([
    ['high-contrast-light', '#707070', '#333333'],
    ['high-contrast-dark', '#8c8c8c', '#d0d0d0']
  ])('allows %s to override the shared scrollbar colors', (preset, thumb, hover) => {
    const vars = createStyleVars({ theme: { activeId: preset, customThemes: [] } })

    expect(vars['--mdp-scrollbar-thumb']).toBe(thumb)
    expect(vars['--mdp-scrollbar-thumb-hover']).toBe(hover)
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

describe('rebaseCustomThemeDraft', () => {
  it('replaces every editable color with the selected base palette', () => {
    const draft = createCustomThemeDraft('light', 'Rebased theme')
    draft.colors.link = '#ff0000'
    draft.colors.surface = '#00ff00'

    const rebased = rebaseCustomThemeDraft(draft, 'dark')

    expect(rebased.baseId).toBe('dark')
    expect(rebased.colors.link).toBe(BUILT_IN_THEMES.dark.link)
    expect(rebased.colors.surface).toBe(BUILT_IN_THEMES.dark.surface)
    expect(rebased.background).toEqual(draft.background)
    expect(rebased.background).toBe(draft.background)
  })
})
