import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  path.resolve(process.cwd(), 'src/viewer/styles/content/_image-document.scss'),
  'utf8'
)

describe('image document styles', () => {
  it('contains raster images without stretching or automatic upscaling', () => {
    expect(css).toMatch(/\.mdp-image-document__image\s*\{[^}]*width:\s*auto;[^}]*height:\s*auto;/s)
    expect(css).toMatch(/\.mdp-image-document__image\s*\{[^}]*max-width:\s*100%;[^}]*object-fit:\s*contain;/s)
  })

  it('provides explicit loading and error state styling', () => {
    expect(css).toContain('.mdp-image-document__state')
    expect(css).toContain('.mdp-image-document__state--error')
  })

  it('uses a smaller contained viewport on mobile', () => {
    expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.mdp-image-document[\s\S]*min-height:/)
  })
})
