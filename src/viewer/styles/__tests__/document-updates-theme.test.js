import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { BUILT_IN_THEMES, createStyleVars } from '../../../theme/index.js'

const css = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css

function contrast(foreground, background) {
  const luminance = (hex) => hex.slice(1).match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  const values = [luminance(foreground), luminance(background)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

const settings = Object.keys(BUILT_IN_THEMES).map((id) => [id, { theme: { activeId: id } }])
for (const baseId of ['light', 'dark']) {
  const id = `custom:audit-${baseId}`
  // Deliberately reverse the custom surface: paired feedback must remain readable
  // even when it no longer matches the base theme's semantic foreground colors.
  settings.push([id, { theme: { activeId: id, customThemes: [{
    id, baseId, colors: {
      surface: baseId === 'light' ? '#121212' : '#ffffff',
      panelBg: baseId === 'light' ? '#000000' : '#ffffff',
      link: baseId === 'light' ? '#ffffff' : '#000000',
      accent: baseId === 'light' ? '#ffffff' : '#000000'
    }
  }] } }])
}

it.each(settings)('keeps update feedback text readable in %s', (id, themeSettings) => {
  const vars = createStyleVars(themeSettings)
  const minimum = id.startsWith('high-contrast') ? 7 : 4.5
  for (const variant of ['info', 'success', 'warning', 'error']) {
    expect(contrast(vars[`--mdp-toast-${variant}-text`], vars[`--mdp-toast-${variant}-bg`])).toBeGreaterThanOrEqual(minimum)
  }
})

function phaseTokens(phase) {
  const rule = css.match(new RegExp(`\\.mdp-watch-status__trigger\\[data-mdp-watch-phase=["']?${phase}["']?\\]\\s*\\{([^}]+)\\}`))?.[1]
  expect(rule, `Missing update button palette for ${phase}`).toBeTruthy()
  return ['color', 'bg', 'border'].map(role => rule.match(new RegExp(`--mdp-watch-${role}:\\s*var\\((--[^)]+)\\)`))?.[1])
}

function overlay(foreground, background, alpha) {
  const channels = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16))
  return '#' + channels(background).map((value, i) => Math.round(value * (1 - alpha) + channels(foreground)[i] * alpha).toString(16).padStart(2, '0')).join('')
}

it.each(settings)('keeps update button states and the breathing peak readable in %s', (id, themeSettings) => {
  const vars = createStyleVars(themeSettings)
  const minimum = id.startsWith('high-contrast') ? 7 : 4.5
  for (const phase of ['ready', 'busy', 'success', 'error', 'warning']) {
    const [foreground, background, border] = phaseTokens(phase).map(token => vars[token])
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum)
    if (id.startsWith('high-contrast')) expect(contrast(border, background)).toBeGreaterThanOrEqual(3)
    if (phase === 'ready') {
      const peakAlpha = Number(css.match(/@keyframes mdp-watch-ready\s*\{[\s\S]*?50%\s*\{\s*opacity:\s*([\d.]+)/)[1])
      // The 18px action glyph is a non-text indicator (3:1); high-contrast
      // themes retain their stronger 7:1 treatment even at pulse maximum.
      expect(contrast(foreground, overlay(foreground, background, peakAlpha))).toBeGreaterThanOrEqual(id.startsWith('high-contrast') ? 7 : 3)
    }
  }
})

it('preserves each status palette on hover instead of reverting to generic action colors', () => {
  expect(css).toMatch(/\.mdp-watch-status__trigger:hover:not\(:disabled\)[^{]*\{[^}]*color:\s*var\(--mdp-watch-color\);[^}]*background:\s*var\(--mdp-watch-bg\)/)
})

it('uses paired diff colors and opaque modal surfaces without a text-colored scrim', () => {
  expect(css).toContain('--mdp-review-added-bg: var(--mdp-toast-success-bg)')
  expect(css).toContain('--mdp-review-added-text: var(--mdp-toast-success-text)')
  expect(css).toContain('--mdp-review-removed-bg: var(--mdp-toast-error-bg)')
  expect(css).toContain('--mdp-review-removed-text: var(--mdp-toast-error-text)')
  expect(css).toMatch(/\.mdp-ui-card\s*\{[^}]*background:\s*var\(--mdp-surface\)/)
  for (const selector of ['mdp-change-review-backdrop', 'mdp-editor-update-confirmation-backdrop', 'mdp-exit-edit-modal']) {
    expect(css).toMatch(new RegExp(`\\.${selector}\\s*\\{[^}]*background: var\\(--mdp-overlay-scrim\\)`))
  }
})
