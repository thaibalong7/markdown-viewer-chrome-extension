import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css

describe('explorer interaction styles', () => {
  it('keeps the loading skeleton integrated with the panel background', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__loading\s*\{[^}]*padding:\s*8px 6px 4px;[^}]*background:\s*transparent;/s
    )
    expect(explorerCss).not.toMatch(
      /\.mdp-explorer__loading[^,{]*,[^{]*\.mdp-explorer__empty\s*\{[^}]*background:/s
    )
  })

  it('gives the active file action button visible hover, focus, and open feedback', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:hover,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:focus-visible,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn\.is-open\s*\{[^}]*background:\s*var\(--mdp-link-soft\);[^}]*color:\s*var\(--mdp-link\);[^}]*opacity:\s*1;/s
    )
  })

  it('keeps tree icons consistently sized and optically aligns folder artwork', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-icon\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-icon svg\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-icon\s*\{[^}]*width:\s*19px;[^}]*height:\s*19px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-icon svg\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;[^}]*transform:\s*translateY\(-1px\);/s
    )
  })
})
