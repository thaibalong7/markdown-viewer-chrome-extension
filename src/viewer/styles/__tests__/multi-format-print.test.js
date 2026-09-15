import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  path.resolve(process.cwd(), 'src/viewer/styles/content/_article-print.scss'),
  'utf8'
)

describe('multi-format print styles', () => {
  it('wraps standalone text, SQL, and Mermaid source instead of clipping it', () => {
    expect(css).toMatch(/\.mdp-text-document,[\s\S]*\.mdp-sql-document pre,[\s\S]*\.mdp-mermaid-document__source[\s\S]*white-space:\s*pre-wrap/)
    expect(css).toMatch(/\.mdp-sql-document code,[\s\S]*\.mdp-sql-document \.line[\s\S]*white-space:\s*pre-wrap/)
  })

  it('contains standalone images on the printed page', () => {
    expect(css).toMatch(/\.mdp-image-document__image\s*\{[\s\S]*max-width:\s*100% !important;[\s\S]*max-height:\s*92vh !important;/)
  })
})
