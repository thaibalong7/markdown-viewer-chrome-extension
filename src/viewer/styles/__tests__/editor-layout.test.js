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
})
