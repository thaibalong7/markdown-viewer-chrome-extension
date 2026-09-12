import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css

describe('explorer interaction styles', () => {
  it('gives the active file action button visible hover, focus, and open feedback', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:hover,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn:focus-visible,[^{]*\.mdp-explorer__node\.is-active \.mdp-explorer__row-action-btn\.is-open\s*\{[^}]*background:\s*var\(--mdp-link-soft\);[^}]*color:\s*var\(--mdp-link\);[^}]*opacity:\s*1;/s
    )
  })
})
