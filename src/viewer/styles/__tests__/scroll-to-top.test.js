import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css

describe('scroll-to-top layout', () => {
  it('tracks the live right rail width when the Outline opens, closes, or resizes', () => {
    expect(layoutCss).toMatch(
      /\.mdp-scroll-to-top\s*\{[^}]*right:\s*calc\(var\(--mdp-right-track\) \+ clamp\(14px, 2vw, 24px\)\)/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-body--no-outline\s*\{[^}]*--mdp-right-track:\s*var\(--mdp-actions-rail-width\)/s
    )
  })

  it('sits above the bottom action rail on narrow screens', () => {
    expect(layoutCss).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.mdp-scroll-to-top\s*\{[^}]*right:\s*12px;[^}]*bottom:\s*80px;/s
    )
  })

  it('does not appear in printed documents', () => {
    expect(layoutCss).toMatch(
      /@media print[\s\S]*\.mdp-scroll-to-top\s*\{[^}]*display:\s*none !important;/s
    )
  })
})
