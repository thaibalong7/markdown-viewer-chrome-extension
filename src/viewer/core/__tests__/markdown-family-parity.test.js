// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderDocument } from '../renderer.js'

const SETTINGS = {
  theme: { activeId: 'light', customThemes: [] },
  plugins: {
    codeHighlight: { enabled: false },
    emoji: { enabled: false },
    footnote: { enabled: false },
    math: { enabled: false },
    mermaid: { enabled: false }
  }
}

const FIXTURE_ROOT = resolve('test/fixtures/multi-format-viewer/markdown-family')

describe('Markdown-family rendering', () => {
  it('renders identical .md and .mdc bytes through the same pipeline', async () => {
    const [markdownSource, mdcSource] = await Promise.all(
      ['document.md', 'document.mdc'].map((name) =>
        readFile(resolve(FIXTURE_ROOT, name), 'utf8')
      )
    )

    expect(mdcSource).toBe(markdownSource)

    const [markdownResult, mdcResult] = await Promise.all([
      renderDocument(markdownSource, SETTINGS),
      renderDocument(mdcSource, SETTINGS)
    ])

    expect(mdcResult.html).toBe(markdownResult.html)
  })
})
