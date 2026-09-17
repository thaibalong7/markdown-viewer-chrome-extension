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
})
