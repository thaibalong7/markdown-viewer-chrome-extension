import { describe, expect, it } from 'vitest'
import { createMarkdownEngine, renderMarkdown } from '../markdown-engine.js'

function render(markdown) {
  return renderMarkdown(markdown, { markdownEngine: createMarkdownEngine() }).html
}

describe('markdown-engine local link normalization', () => {
  it('encodes spaces in local markdown link destinations', () => {
    const html = render('[Notes](My Notes.md)')
    expect(html).toContain('href="My%20Notes.md"')
  })

  it('preserves markdown link titles while encoding destination spaces', () => {
    const html = render('[Notes](My Notes.md "Project Notes")')
    expect(html).toContain('href="My%20Notes.md"')
    expect(html).toContain('title="Project Notes"')
  })

  it('does not rewrite links inside inline code spans', () => {
    const html = render('`[Notes](My Notes.md)`')
    expect(html).toContain('[Notes](My Notes.md)')
    expect(html).not.toContain('href="My%20Notes.md"')
  })

  it('does not rewrite links inside fenced code blocks', () => {
    const html = render('```md\n[Notes](My Notes.md)\n```')
    expect(html).toContain('[Notes](My Notes.md)')
    expect(html).not.toContain('href="My%20Notes.md"')
  })

  it('keeps encoded external links unchanged and marks them safe for new tabs', () => {
    const html = render('[Site](https://example.com/a%20b)')
    expect(html).toContain('href="https://example.com/a%20b"')
    expect(html).toContain('target="_blank"')
  })

  it('preserves nested parentheses in local link destinations', () => {
    const html = render('[Spec](docs/My Notes (draft).md)')
    expect(html).toContain('href="docs/My%20Notes%20(draft).md"')
  })

  it('does not make unsafe links valid during local link normalization', () => {
    const html = render('[Bad](javascript:alert(1 2))')
    expect(html).not.toContain('href="javascript:')
  })
})
