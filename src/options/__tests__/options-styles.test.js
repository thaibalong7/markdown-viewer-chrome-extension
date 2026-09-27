import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const optionsCss = compile(fileURLToPath(new URL('../options.scss', import.meta.url))).css

describe('settings design-system styles', () => {
  it('emits the shared application controls consumed by Settings', () => {
    expect(optionsCss).toContain('.mdp-ui-button--primary')
    expect(optionsCss).toContain('.mdp-ui-input')
    expect(optionsCss).toContain('.mdp-ui-switch__track')
    expect(optionsCss).toContain('.mdp-ui-setting-row')
    expect(optionsCss).toContain('.mdp-ui-notice--warning')
  })

  it('uses link semantics for checked switches and danger semantics for invalid fields', () => {
    expect(optionsCss).toMatch(
      /\.mdp-ui-switch input:checked \+ \.mdp-ui-switch__track\s*\{[^}]*border-color: var\(--mdp-link\);[^}]*background: var\(--mdp-link\);/s
    )
    expect(optionsCss).toMatch(
      /\.mdp-ui-input\[aria-invalid=true\][^{]*\{[^}]*border-color: var\(--mdp-danger\);/s
    )
  })

  it('keeps page controls compact while preserving coarse-pointer targets', () => {
    expect(optionsCss).toMatch(
      /\.mdp-ui-button\s*\{[^}]*min-height: 36px;[^}]*padding: 6px 11px;/s
    )
    expect(optionsCss).toMatch(
      /\.mdp-ui-input,[^{]*\.mdp-ui-select\s*\{[^}]*min-height: 36px;[^}]*padding: 6px 10px;[^}]*font-size: 13px;/s
    )
    expect(optionsCss).toMatch(
      /@media \(pointer: coarse\)[\s\S]*\.mdp-ui-input,[\s\S]*\.mdp-ui-switch\s*\{[^}]*min-height: 44px;/s
    )
  })

  it('includes system dark-theme tokens and reduced-motion behavior', () => {
    expect(optionsCss).toMatch(/@media \(prefers-color-scheme: dark\)/)
    expect(optionsCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('uses a wide, bounded settings frame with responsive navigation', () => {
    expect(optionsCss).toMatch(
      /\.settings-header__inner\s*\{[^}]*width: min\(var\(--settings-frame-width\), 100%\);/s
    )
    expect(optionsCss).toMatch(
      /\.settings-layout\s*\{[^}]*width: min\(var\(--settings-frame-width\), 100%\);[^}]*grid-template-columns: clamp\(224px, 18vw, 280px\) minmax\(0, 1fr\);/s
    )
    expect(optionsCss).toMatch(
      /\.settings-section--themes\s*\{[^}]*width: min\(1280px, 100%\);/s
    )
    expect(optionsCss).toMatch(
      /\.settings-section\s*\{[^}]*width: min\(880px, 100%\);[^}]*margin-inline: auto;/s
    )
    expect(optionsCss).toMatch(
      /@media \(max-width: 1023px\)[\s\S]*\.settings-layout\s*\{[^}]*grid-template-columns: 208px minmax\(0, 1fr\);/s
    )
  })

  it('lays out the custom theme library, editor, and color controls', () => {
    expect(optionsCss).toContain('.settings-theme-list')
    expect(optionsCss).toContain('.settings-theme-card__actions')
    expect(optionsCss).toMatch(
      /\.settings-theme-card\s*\{[^}]*grid-template-columns: 96px minmax\(0, 1fr\) auto;[^}]*min-height: 80px;[^}]*padding: 11px 14px;/s
    )
    expect(optionsCss).toMatch(
      /\.settings-theme-card__swatches\s*\{[^}]*height: 46px;/s
    )
    expect(optionsCss).toContain('.settings-theme-editor-page__nav')
    expect(optionsCss).toContain('.settings-theme-workbench')
    expect(optionsCss).toContain('.settings-theme-identity-grid')
    expect(optionsCss).toContain('.settings-theme-base-control__palette')
    expect(optionsCss).toContain('.settings-theme-color-grid')
    expect(optionsCss).toContain('.settings-theme-color-field__control')
    expect(optionsCss).toContain('.settings-theme-preview__viewer')
    expect(optionsCss).toContain('.settings-theme-preview__viewport--visual')
    expect(optionsCss).toMatch(
      /@media \(max-width: 1240px\)[\s\S]*\.settings-theme-workbench\s*\{[^}]*grid-template-columns: 1fr;/s
    )
  })
})
