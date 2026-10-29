// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { version as katexVersion } from 'katex/package.json'

const downloads = vi.hoisted(() => ({ trigger: vi.fn() }))
// Keep the rendering/sanitization path real; capture only the download boundary.
vi.mock('../../../shared/download.js', async (importOriginal) => ({
  ...await importOriginal(), triggerDownload: downloads.trigger
}))

import { renderDocument, renderIntoElement } from '../renderer.js'
import { exportAsHtml, exportAsWord } from '../../actions/document-actions.js'

const SETTINGS = {
  theme: { activeId: 'light', customThemes: [] },
  plugins: { math: { enabled: true }, codeHighlight: { enabled: true } }
}

const SOURCE = [
  '# Hướng dẫn',
  '# Hướng dẫn',
  '[Local](My Notes.md)',
  '[External](https://example.com)',
  '```javascript\nconst answer = 42\n```',
  '$x^2 + y^2$',
  '$$\n\\frac{1}{2}\n$$',
  '<img src="x" onerror="alert(1)"><script>alert(1)</script>',
  '<a href="javascript:alert(1)">Unsafe</a>'
].join('\n\n')

async function renderArticle() {
  const result = await renderDocument(SOURCE, SETTINGS)
  expect(result.warnings).toEqual([])
  const article = document.createElement('article')
  renderIntoElement(article, result.html)
  return article
}

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

afterEach(() => downloads.trigger.mockClear())

describe('dependency rendering integration', () => {
  it('preserves Markdown, Shiki colors and KaTeX HTML/MathML through real DOMPurify', async () => {
    const article = await renderArticle()
    expect([...article.querySelectorAll('h1')].map((node) => node.id))
      .toEqual(['hướng-dẫn', 'hướng-dẫn-1'])
    expect(article.querySelector('a[href="My%20Notes.md"]')).not.toBeNull()
    expect(article.querySelector('a[href="https://example.com"]').rel)
      .toContain('noopener')
    expect(article.querySelector('pre.shiki code').textContent).toContain('const answer = 42')
    expect(article.querySelector('pre.shiki span[style*="color"]')).not.toBeNull()
    expect(article.querySelectorAll('.katex')).toHaveLength(2)
    expect(article.querySelectorAll('.katex math')).toHaveLength(2)
    expect(article.querySelector('.katex-display')).not.toBeNull()
    expect(article.querySelector('script, [onerror], a[href^="javascript:"]')).toBeNull()
  })

  it.each([
    ['HTML', exportAsHtml, 'math.html'],
    ['Word HTML', exportAsWord, 'math.doc']
  ])('exports sanitized Math and matching KaTeX CSS in %s', async (_format, exportDocument, filename) => {
    const article = await renderArticle()
    await exportDocument(article, SETTINGS, filename)
    expect(downloads.trigger).toHaveBeenCalledOnce()
    const download = downloads.trigger.mock.calls[0][0]
    expect(download.filename).toBe(filename)
    const html = await readBlob(download.blob)
    const exported = new DOMParser().parseFromString(html, 'text/html')
    expect(exported.querySelector('link[rel="stylesheet"]').getAttribute('href'))
      .toBe(`https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css`)
    expect(exported.querySelectorAll('.katex')).toHaveLength(2)
    expect(exported.querySelector('pre.shiki')).not.toBeNull()
    expect(exported.querySelector('script, [onerror], a[href^="javascript:"]')).toBeNull()
  })
})
