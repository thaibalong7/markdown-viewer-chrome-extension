import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { BUILT_IN_THEMES, createStyleVars } from '../../../theme/index.js'

const css = compile(fileURLToPath(new URL('../content.scss', import.meta.url))).css
const variants = { note: 'info', tip: 'success', important: 'info', warning: 'warning', caution: 'error' }
const themes = Object.keys(BUILT_IN_THEMES).map(id => [id, { theme: { activeId: id } }])
for (const baseId of ['light', 'dark']) {
  const id = `custom:alerts-${baseId}`
  themes.push([id, { theme: { activeId: id, customThemes: [{
    id, baseId, colors: {
      surface: baseId === 'light' ? '#121212' : '#ffffff',
      bodyText: baseId === 'light' ? '#ffffff' : '#000000',
      heading: baseId === 'light' ? '#ffffff' : '#000000',
      link: baseId === 'light' ? '#ffffff' : '#000000',
      accent: baseId === 'light' ? '#ffffff' : '#000000'
    }, background: { type: 'gradient', startColor: '#000000', endColor: '#ffffff', angle: 135 }
  }] } }])
}

function contrast(foreground, background) {
  const luminance = hex => hex.slice(1).match(/../g)
    .map(channel => Number.parseInt(channel, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  const values = [luminance(foreground), luminance(background)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

it.each(themes)('keeps all alert labels and body text readable in %s', (id, settings) => {
  const vars = createStyleVars(settings)
  for (const [type, variant] of Object.entries(variants)) {
    const selector = variant === 'info' ? '\\.mdp-markdown-body \\.mdp-alert' : `\\.mdp-markdown-body \\.mdp-alert--${type}`
    const rule = css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`))?.[1]
    const foregroundToken = rule?.match(/--mdp-alert-color:\s*var\((--[^)]+)\)/)?.[1]
    const backgroundToken = rule?.match(/--mdp-alert-bg:\s*var\((--[^)]+)\)/)?.[1]
    expect(foregroundToken).toBe(`--mdp-toast-${variant}-text`)
    expect(backgroundToken).toBe(`--mdp-toast-${variant}-bg`)
    expect(contrast(vars[foregroundToken], vars[backgroundToken])).toBeGreaterThanOrEqual(id.startsWith('high-contrast') ? 7 : 4.5)
  }
})

it('uses opaque paired surfaces, inherited reader typography and shared notice geometry', () => {
  const rule = css.match(/\.mdp-markdown-body \.mdp-alert\s*\{([^}]+)\}/)[1]
  expect(rule).toContain('background: var(--mdp-alert-bg)')
  expect(rule).toContain('color: var(--mdp-alert-color)')
  expect(rule).toContain('border-inline-start: 3px solid var(--mdp-alert-color)')
  expect(rule).toContain('border-radius: 8px')
  expect(rule).not.toContain('font-size:')
  expect(css).toMatch(/\.mdp-markdown-body \.mdp-alert a\s*\{[^}]*text-decoration-color: currentColor/)
})

it('keeps labels and outlines legible when printed without background colors', () => {
  expect(css).toMatch(/@media print\s*\{\s*\.mdp-markdown-body \.mdp-alert\s*\{[^}]*break-inside: avoid;[^}]*background: white;[^}]*color: black;/)
})
