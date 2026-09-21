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

  it('keeps file-access onboarding compact and visually stateful', () => {
    expect(popupCss).toMatch(/\.popup-file-access\s*\{[^}]*margin: 8px 10px 0;[^}]*font-size: 11px;/s)
    expect(popupCss).toMatch(
      /\.popup-file-access--allowed\s*\{[^}]*display: inline-flex;[^}]*margin: 0 0 0 auto;[^}]*padding: 4px 7px;[^}]*border: 0;[^}]*border-radius: 999px;/s
    )
    expect(popupCss).toMatch(/\.popup-file-access--allowed::before\s*\{[^}]*background: var\(--mdp-accent\);/s)
  })

  it('uses a compact labeled tab bar instead of a permanent side rail', () => {
    expect(popupCss).toMatch(
      /\.popup-settings-tabs\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/s
    )
    expect(popupCss).toMatch(
      /\.popup-settings-tab\s*\{[^}]*min-height: 38px;[^}]*display: inline-flex;/s
    )
  })

  it('renders reader themes as compact visual choices', () => {
    expect(popupCss).toMatch(
      /\.popup-theme-options\s*\{[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/s
    )
    expect(popupCss).toMatch(
      /\.popup-theme-option\.is-selected\s*\{[^}]*background: var\(--mdp-link-soft\);/s
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
    expect(popupCss).toMatch(
      /\.popup-plugin-heading\s*\{[^}]*align-items: flex-start;/s
    )
    expect(popupCss).toMatch(
      /\.popup-plugin-heading \.mdp-ui-switch\s*\{[^}]*min-height: 24px;/s
    )
    expect(popupCss).toMatch(
      /\.popup-plugin-info\s*\{[^}]*width: 14px;[^}]*height: 14px;/s
    )
  })

  it('presents Mermaid renderers as a compact segmented control', () => {
    expect(popupCss).toMatch(
      /\.popup-mermaid-renderers__options\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s
    )
    expect(popupCss).toMatch(
      /\.popup-mermaid-renderer\.is-selected \.popup-mermaid-renderer__label\s*\{[^}]*background: var\(--mdp-surface\);[^}]*color: var\(--mdp-link\);/s
    )
    expect(popupCss).toMatch(
      /\.popup-mermaid-renderer__label\s*\{[^}]*min-height: 24px;/s
    )
  })

  it('scrolls overflowing panels without shrinking and overlapping their fields', () => {
    expect(popupCss).toMatch(
      /\.popup-settings-content > \*\s*\{[^}]*flex: 0 0 auto;/s
    )
  })

  it('keeps scrolling owned by the active panel when the file-access callout is visible', () => {
    expect(popupCss).toMatch(/body\s*\{[^}]*overflow: hidden;/s)
    expect(popupCss).toMatch(
      /\.popup-root\s*\{[^}]*max-height: 600px;[^}]*display: flex;[^}]*overflow: hidden;/s
    )
    expect(popupCss).toMatch(
      /\.popup-settings-panel\s*\{[^}]*flex: 1 1 auto;[^}]*overflow: hidden;/s
    )
    expect(popupCss).toMatch(
      /\.popup-settings-content\s*\{[^}]*min-height: 0;[^}]*flex: 1 1 auto;[^}]*overflow-y: auto;/s
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
