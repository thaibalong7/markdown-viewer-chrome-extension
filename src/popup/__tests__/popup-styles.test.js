import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const popupCss = compile(fileURLToPath(new URL('../popup.scss', import.meta.url))).css

describe('popup design-system styles', () => {
  it('emits the shared application primitives consumed by the popup', () => {
    expect(popupCss).toContain('.mdp-ui-button--danger')
    expect(popupCss).toContain('.mdp-ui-input')
    expect(popupCss).toContain('.mdp-ui-switch__track')
    expect(popupCss).toContain('.mdp-ui-status--success')
    expect(popupCss).toContain('.mdp-ui-state--error')
  })

  it('uses semantic tokens for the popup shell and active navigation', () => {
    expect(popupCss).toMatch(/\.popup-app-header\s*\{[^}]*background: var\(--mdp-surface\)/s)
    expect(popupCss).toMatch(
      /\.popup-settings-tab\.is-active\s*\{[^}]*background: var\(--mdp-link-soft\);[^}]*color: var\(--mdp-link\)/s
    )
  })

  it('keeps compact number fields in a stable single-column layout', () => {
    expect(popupCss).toMatch(
      /\.popup-settings-content \.mdp-ui-number-field\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*gap: 6px;/s
    )
  })

  it('uses a denser control scale than the full Settings page', () => {
    expect(popupCss).toMatch(
      /\.popup-settings-content \.mdp-ui-input,[^{]*\.popup-settings-content \.mdp-ui-select\s*\{[^}]*min-height: 32px;[^}]*padding: 5px 8px;/s
    )
    expect(popupCss).toMatch(
      /\.popup-settings-content \.mdp-ui-switch__track\s*\{[^}]*width: 34px;[^}]*height: 20px;/s
    )
    expect(popupCss).toMatch(
      /\.popup-settings-content \.mdp-ui-button\s*\{[^}]*min-height: 32px;/s
    )
  })

  it('scrolls overflowing panels without shrinking and overlapping their fields', () => {
    expect(popupCss).toMatch(
      /\.popup-settings-content > \*\s*\{[^}]*flex: 0 0 auto;/s
    )
  })

  it('lets the popup viewport shrink again when switching to a shorter panel', () => {
    expect(popupCss).not.toMatch(
      /html,\s*body,\s*#root\s*\{[^}]*min-height: 100%;/s
    )
    expect(popupCss).toMatch(/\.popup-root\s*\{[^}]*min-height: 280px;/s)
  })

  it('supports system dark theme and reduced motion', () => {
    expect(popupCss).toMatch(/@media \(prefers-color-scheme: dark\)/)
    expect(popupCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})
