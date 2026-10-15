import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css
const contentCss = compile(fileURLToPath(new URL('../content.scss', import.meta.url))).css

describe('reader content spacing', () => {
  it('keeps the outer content pane compact', () => {
    expect(layoutCss).toMatch(
      /\.mdp-content-pane\s*\{[^}]*padding: 16px clamp\(16px, 2vw, 28px\) 48px;/s
    )
  })

  it('keeps article padding compact on desktop and mobile', () => {
    expect(contentCss).toMatch(
      /\.mdp-markdown-body\s*\{[^}]*padding: 16px clamp\(12px, 2vw, 24px\) 48px;/s
    )
    expect(contentCss).toMatch(
      /@media \(max-width: 639px\)[\s\S]*?\.mdp-markdown-body\s*\{[^}]*padding: 16px 8px 32px;/s
    )
  })
})
