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
    id, baseId, colors: { surface: baseId === 'light' ? '#121212' : '#ffffff' }
  }] } }])
}

it.each(settings)('keeps update feedback text readable in %s', (id, themeSettings) => {
  const vars = createStyleVars(themeSettings)
  const minimum = id.startsWith('high-contrast') ? 7 : 4.5
  for (const variant of ['info', 'success', 'warning', 'error']) {
    expect(contrast(vars[`--mdp-toast-${variant}-text`], vars[`--mdp-toast-${variant}-bg`])).toBeGreaterThanOrEqual(minimum)
  }
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
