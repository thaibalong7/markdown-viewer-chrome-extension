import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css
const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css
const tocCss = compile(fileURLToPath(new URL('../toc.scss', import.meta.url))).css

describe('sidebar scrollbar layout', () => {
  it('reserves a stable scrollbar gutter in Files', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer-container\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer-container\s*\{[^}]*padding-inline-end:\s*3px;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-sidebar--files\s*\{[^}]*padding-inline-end:\s*5px;/s
    )
  })

  it('reserves a stable scrollbar gutter in Outline', () => {
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
  })

  it('adapts expanded document actions to the resized right rail', () => {
    expect(layoutCss).toMatch(
      /\.mdp-right-rail\s*\{[^}]*container:\s*mdp-right-rail\s*\/\s*inline-size;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-floating-actions\.mdp-floating-actions--rail-strip\s*\{[^}]*gap:\s*4px;[^}]*padding:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-right-rail--outline-expanded > \.mdp-panel-toggle--outline\s*\{[^}]*top:\s*25px;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-right-rail__actions-row\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*min-height:\s*44px;[^}]*padding:\s*0 2px 8px;[^}]*border-bottom:/s
    )
    expect(layoutCss).toMatch(
      /@container mdp-right-rail \(max-width: 339px\)[\s\S]*\.mdp-right-rail__actions-label\s*\{[^}]*display:\s*none;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-right-rail--actions-only > \.mdp-right-rail__actions-row\s*\{[^}]*display:\s*contents;/s
    )
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline\s*\{[^}]*padding-top:\s*12px;/s
    )
  })

  it('keeps collapsed actions visually consistent with the expanded utility strip', () => {
    expect(layoutCss).toMatch(
      /\.mdp-right-rail--actions-only \.mdp-floating-actions--rail-strip\s*\{[^}]*flex-direction:\s*column;[^}]*flex-wrap:\s*nowrap;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-floating-actions--rail-strip \.mdp-fab-btn:not\(\.mdp-fab-btn--theme\)\s*\{[^}]*border-color:\s*transparent;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-right-rail--outline-collapsed \.mdp-floating-actions\s*\{[^}]*margin-top:\s*0;/s
    )
  })
})
