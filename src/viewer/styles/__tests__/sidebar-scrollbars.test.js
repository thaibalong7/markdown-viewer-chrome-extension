import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css
const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css
const tocCss = compile(fileURLToPath(new URL('../toc.scss', import.meta.url))).css

describe('sidebar scrollbar layout', () => {
  it('reserves a stable scrollbar gutter in Files', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer-container\s*\{[^}]*overflow:\s*hidden;[^}]*padding-inline-end:\s*3px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__scroll-region\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-sidebar--files\s*\{[^}]*padding-inline-start:\s*8px;[^}]*padding-inline-end:\s*5px;/s
    )
  })

  it('reserves a stable scrollbar gutter in Outline', () => {
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-right-rail\s*\{[^}]*padding-inline-start:\s*8px;[^}]*padding-inline-end:\s*14px;/s
    )
  })

  it('uses compact hierarchy spacing while keeping heading names on one line', () => {
    expect(tocCss).toMatch(
      /\.mdp-toc__link\s*\{[^}]*padding:\s*8px 6px;[^}]*white-space:\s*nowrap;/s
    )
    expect(tocCss).toMatch(/\.mdp-toc__link--h1\s*\{[^}]*padding-left:\s*10px;/s)
    expect(tocCss).toMatch(/\.mdp-toc__link--h2\s*\{[^}]*padding-left:\s*18px;/s)
    expect(tocCss).toMatch(/\.mdp-toc__link--h6\s*\{[^}]*padding-left:\s*50px;/s)
    expect(tocCss).not.toMatch(/\.mdp-toc__link--h\d\.is-active\s*\{[^}]*padding-left:/s)
  })

  it('shares theme scrollbar colors between native panels and the viewer overlay', () => {
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc\s*\{[^}]*scrollbar-color:\s*var\(--mdp-scrollbar-thumb\) transparent;/s
    )
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--mdp-scrollbar-thumb\);/s
    )
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*var\(--mdp-scrollbar-thumb-hover\);/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-viewer-scrollbar__thumb\s*\{[^}]*background:\s*var\(\s*--mdp-scrollbar-thumb,/s
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
