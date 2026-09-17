import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const explorerCss = compile(fileURLToPath(new URL('../explorer.scss', import.meta.url))).css
const tocCss = compile(fileURLToPath(new URL('../toc.scss', import.meta.url))).css

describe('sidebar scrollbar layout', () => {
  it('reserves a stable scrollbar gutter in Files', () => {
    expect(explorerCss).toMatch(
      /\.mdp-explorer-container\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
  })

  it('reserves a stable scrollbar gutter in Outline', () => {
    expect(tocCss).toMatch(
      /\.mdp-sidebar-panel--outline \.mdp-toc\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s
    )
  })
})
