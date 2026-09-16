import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const layoutCss = compile(fileURLToPath(new URL('../layout.scss', import.meta.url))).css
const contentCss = compile(fileURLToPath(new URL('../content.scss', import.meta.url))).css

describe('reader content spacing', () => {
  it('keeps the outer content pane compact', () => {
    expect(layoutCss).toMatch(
      /\.mdp-content-pane\s*\{[^}]*padding: clamp\(12px, 1\.5vw, 20px\) clamp\(16px, 2\.5vw, 36px\) 48px;/s
    )
  })

  it('keeps article padding compact on desktop and mobile', () => {
    expect(contentCss).toMatch(
      /\.mdp-markdown-body\s*\{[^}]*padding: clamp\(16px, 2vw, 28px\) clamp\(20px, 3\.5vw, 48px\) clamp\(36px, 5vw, 64px\);/s
    )
    expect(contentCss).toMatch(
      /@media \(max-width: 639px\)[\s\S]*?\.mdp-markdown-body\s*\{[^}]*padding: 16px 14px 40px;/s
    )
  })
})
