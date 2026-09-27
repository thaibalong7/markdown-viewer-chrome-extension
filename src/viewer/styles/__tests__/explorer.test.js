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

  it('shrinks long file names before the row action button can cover them', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node:hover \.mdp-explorer__node-btn,[^{]*\.mdp-explorer__node:focus-within \.mdp-explorer__node-btn,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__node-btn,[^{]*\.mdp-explorer__node\.is-menu-open \.mdp-explorer__node-btn\s*\{[^}]*padding-right:\s*38px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-label\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s
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

  it('uses compact tree spacing while keeping names on one line', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-btn\s*\{[^}]*gap:\s*5px;[^}]*padding:\s*8px 6px;[^}]*white-space:\s*nowrap;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-folder-row\s*\{[^}]*gap:\s*5px;[^}]*padding:\s*8px 6px 8px 2px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node-depth\s*\{[^}]*width:\s*14px;/s
    )
    expect(explorerCss).toMatch(
      /\.mdp-explorer__tree-chevron\s*\{[^}]*width:\s*14px;/s
    )
  })
})
