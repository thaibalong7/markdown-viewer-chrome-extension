import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css

describe('editor layout styles', () => {
  it('keeps split and focus grids more specific than the base viewer grid', () => {
    expect(layoutCss).toMatch(
      /\.mdp-body\.mdp-body--edit-split\s*\{[^}]*grid-template-columns:/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-body\.mdp-body--edit-focus\s*\{[^}]*grid-template-columns:/s
    )
  })

  it('animates the desktop preview into its split width quickly', () => {
    expect(layoutCss).toMatch(
      /\.mdp-body\.mdp-body--edit-split\s*\{[^}]*animation: mdp-enter-edit-split 480ms/s
    )
    expect(layoutCss).toMatch(
      /@keyframes mdp-enter-edit-split\s*\{\s*from\s*\{[^}]*grid-template-columns:/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-root\.is-resizing-editor-split \.mdp-body--edit-split\s*\{[^}]*animation: none/s
    )
  })

  it('emphasizes the full active resize handle while dragging', () => {
    expect(layoutCss).toMatch(
      /\.mdp-sidebar__resize-handle\.is-dragging::after\s*\{[^}]*height: 100%[^}]*background: var\(--mdp-link\)/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-editor-split__resize-handle\.is-dragging::after\s*\{[^}]*height: 100%[^}]*background: var\(--mdp-link\)/s
    )
  })

  it('keeps resize grips visible before hover', () => {
    expect(layoutCss).toMatch(
      /\.mdp-sidebar__resize-handle::after\s*\{[^}]*height: 42px[^}]*opacity: 0\.62/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-editor-split__resize-handle::after\s*\{[^}]*height: 36px[^}]*opacity: 0\.62/s
    )
  })

  it('centers the editor separator line under its resize grip', () => {
    expect(layoutCss).toMatch(
      /\.mdp-editor-split__resize-handle\s*\{[^}]*background-position: center[^}]*background-size: 1px 100%/s
    )
  })

  it('optically centers sidebar grips over their one-pixel panel borders', () => {
    expect(layoutCss).toMatch(
      /\.mdp-sidebar__resize-handle\s*\{[^}]*right: -4\.5px/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-sidebar__resize-handle::after\s*\{[^}]*left: 50%[^}]*width: 3px[^}]*transform: translate\(-50%, -50%\)/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-sidebar__resize-handle--right\s*\{[^}]*left: -4\.5px/s
    )
  })

  it('gives the light/dark quick toggle distinct theme-aware emphasis', () => {
    expect(layoutCss).toMatch(
      /\.mdp-fab-btn--theme\s*\{[^}]*--mdp-theme-action-color:\s*var\(--mdp-link\);[^}]*box-shadow:/s
    )
    expect(layoutCss).toMatch(
      /\.mdp-fab-btn--theme\[aria-pressed=true\]\s*\{[^}]*--mdp-theme-action-color:\s*var\(--mdp-warning\);/s
    )
    expect(layoutCss).toContain('.mdp-fab-btn__theme-icon--light')
    expect(layoutCss).toContain('.mdp-fab-btn__theme-icon--dark')
  })
})
