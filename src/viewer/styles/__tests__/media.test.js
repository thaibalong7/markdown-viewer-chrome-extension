import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const contentCss = compile(fileURLToPath(new URL('../content.scss', import.meta.url))).css

describe('article media styles', () => {
  it('keeps raster images and SVGs inside the article width while preserving aspect ratio', () => {
    expect(contentCss).toMatch(
      /\.mdp-markdown-body img,\s*\.mdp-markdown-body svg\s*\{[^}]*max-inline-size:\s*100%;[^}]*block-size:\s*auto;/s
    )
  })

  it('centers Markdown images without stretching smaller assets', () => {
    expect(contentCss).toMatch(
      /\.mdp-markdown-body img\s*\{[^}]*display:\s*block;[^}]*margin-inline:\s*auto;[^}]*object-fit:\s*contain;/s
    )
  })

  it('marks prepared Markdown images as zoom targets and styles the zoom overlay', () => {
    expect(contentCss).toMatch(/img\.mdp-image-zoom-target\s*\{[^}]*cursor:\s*zoom-in;/s)
    expect(contentCss).toMatch(/\.mdp-image-lightbox\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s)
    expect(contentCss).toMatch(/\.mdp-image-lightbox__viewport\s*\{[^}]*touch-action:\s*none;/s)
  })
})
