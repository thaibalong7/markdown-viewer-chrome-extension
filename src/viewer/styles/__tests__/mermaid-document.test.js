import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  path.resolve(process.cwd(), 'src/viewer/styles/content/_mermaid.scss'),
  'utf8'
)

describe('standalone Mermaid document styles', () => {
  it('preserves raw-source whitespace and provides explicit document states', () => {
    expect(css).toMatch(/\.mdp-mermaid-document__source\s*\{[^}]*white-space:\s*pre;/s)
    expect(css).toContain('.mdp-mermaid-document__state')
    expect(css).toContain('.mdp-mermaid-document__state--error')
  })

  it('tightens standalone source spacing on mobile', () => {
    expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.mdp-mermaid-document__source/)
  })

  it('keeps an oversized diagram scrollable from its inline start edge', () => {
    expect(css).toMatch(
      /\.mdp-mermaid\s*\{[^}]*overflow-x:\s*auto;[^}]*justify-content:\s*safe center;/s
    )
  })
})
