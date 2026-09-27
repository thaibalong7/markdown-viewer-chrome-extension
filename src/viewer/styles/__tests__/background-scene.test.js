import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css
const baseCss = compile(fileURLToPath(new URL('../base.scss', import.meta.url))).css
const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css

describe('viewer background scene', () => {
  it('places one fixed visual layer behind the viewer grid', () => {
    expect(layoutCss).toMatch(
      /\.mdp-background-scene\s*\{[^}]*position: fixed;[^}]*z-index: 0;[^}]*pointer-events: none;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-body\s*\{[^}]*position: relative;[^}]*z-index: 1;[^}]*background: transparent;/s
    )
  })

  it('switches shared semantic surfaces only when a visual background is active', () => {
    expect(layoutCss).toMatch(
      /\.mdp-root--has-visual-background\s*\{[^}]*--mdp-sidebar-layer-background:\s*color-mix\(\s*in srgb,\s*var\(--mdp-sidebar-surface\) 66%,\s*transparent\s*\)/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-root--has-visual-background\s*\{[^}]*--mdp-content-layer-background:\s*color-mix\(\s*in srgb,\s*var\(--mdp-content-surface\) 74%,\s*transparent\s*\)/s
    )
    expect(layoutCss).toMatch(/\.mdp-sidebar\s*\{[^}]*background: var\(--mdp-sidebar-layer-background\)/s)
    expect(layoutCss).toMatch(/\.mdp-content-pane\s*\{[^}]*background: var\(--mdp-content-layer-background\)/s)
  })

  it('keeps the Files header outside the scrollable list for every background', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__header\s*\{[^}]*position:\s*relative;[^}]*flex-shrink:\s*0;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__scroll-region\s*\{[^}]*overflow-y:\s*auto;/s
    )
    expect(layoutCss).not.toContain('--mdp-sticky-panel')
  })

  it('removes the native gutter and renders a theme-aware overlay scrollbar', () => {
    expect(baseCss).toMatch(
      /\.mdp-root\s*\{[^}]*scrollbar-width:\s*none;/s
    )
    expect(baseCss).toMatch(
      /\.mdp-root::-webkit-scrollbar\s*\{[^}]*display:\s*none;[^}]*width:\s*0;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-viewer-scrollbar\s*\{[^}]*position:\s*fixed;[^}]*background:\s*transparent;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-viewer-scrollbar__thumb\s*\{[^}]*background:\s*var\(--mdp-scrollbar-thumb,/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-viewer-scrollbar \.mdp-viewer-scrollbar__thumb\s*\{[^}]*opacity:\s*0;/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-viewer-scrollbar\.is-active \.mdp-viewer-scrollbar__thumb[^{]*\{[^}]*opacity:\s*1;/s
    )
  })

  it('pauses hidden-page motion and disables it for reduced-motion users', () => {
    expect(layoutCss).toContain('animation-play-state: paused')
    expect(layoutCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(layoutCss).toMatch(/animation: none !important/)
  })
})
