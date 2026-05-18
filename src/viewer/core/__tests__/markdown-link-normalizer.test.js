import { describe, expect, it } from 'vitest'
import { normalizeLocalMarkdownLinkDestinations } from '../markdown-link-normalizer.js'

describe('normalizeLocalMarkdownLinkDestinations', () => {
  it('encodes spaces in local markdown link destinations', () => {
    expect(normalizeLocalMarkdownLinkDestinations('[Notes](My Notes.md)')).toBe(
      '[Notes](My%20Notes.md)'
    )
  })

  it('preserves titles while encoding destination spaces', () => {
    expect(normalizeLocalMarkdownLinkDestinations('[Notes](My Notes.md "Project Notes")')).toBe(
      '[Notes](My%20Notes.md "Project Notes")'
    )
  })

  it('does not rewrite links inside inline code spans', () => {
    expect(normalizeLocalMarkdownLinkDestinations('`[Notes](My Notes.md)`')).toBe(
      '`[Notes](My Notes.md)`'
    )
  })

  it('does not rewrite links inside fenced code blocks', () => {
    const markdown = '```md\n[Notes](My Notes.md)\n```'
    expect(normalizeLocalMarkdownLinkDestinations(markdown)).toBe(markdown)
  })

  it('preserves nested parentheses while encoding spaces', () => {
    expect(normalizeLocalMarkdownLinkDestinations('[Spec](docs/My Notes (draft).md)')).toBe(
      '[Spec](docs/My%20Notes%20(draft).md)'
    )
  })

  it('does not rewrite external or unsafe absolute links', () => {
    expect(normalizeLocalMarkdownLinkDestinations('[Site](https://example.com/a b)')).toBe(
      '[Site](https://example.com/a b)'
    )
    expect(normalizeLocalMarkdownLinkDestinations('[Bad](javascript:alert(1 2))')).toBe(
      '[Bad](javascript:alert(1 2))'
    )
  })
})
