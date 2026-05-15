import { describe, expect, it } from 'vitest'
import {
  fileHistoryDirectoryFromUrl,
  fileHistoryTitleFromUrl,
  normalizeFileHistoryUrl,
  upsertFileHistoryEntry
} from '../file-history.js'

describe('file-history', () => {
  it('normalizes local markdown file URLs and removes hash/search', () => {
    expect(normalizeFileHistoryUrl('file:///Users/me/docs/README.md?x=1#intro')).toBe(
      'file:///Users/me/docs/README.md'
    )
  })

  it('rejects non-file and non-markdown URLs', () => {
    expect(normalizeFileHistoryUrl('https://example.com/readme.md')).toBeNull()
    expect(normalizeFileHistoryUrl('file:///Users/me/docs/image.png')).toBeNull()
  })

  it('builds readable labels from encoded file URLs', () => {
    const url = 'file:///Users/me/My%20Docs/Project%20Notes.md'

    expect(fileHistoryTitleFromUrl(url)).toBe('Project Notes.md')
    expect(fileHistoryDirectoryFromUrl(url)).toBe('/Users/me/My Docs')
  })

  it('upserts newest entries first and deduplicates by normalized URL', () => {
    const existing = [
      { url: 'file:///Users/me/a.md', title: 'a.md', openedAt: 1 },
      { url: 'file:///Users/me/b.md', title: 'b.md', openedAt: 2 }
    ]

    expect(
      upsertFileHistoryEntry(existing, {
        url: 'file:///Users/me/a.md#later',
        title: 'A renamed',
        openedAt: 3
      })
    ).toEqual([
      { url: 'file:///Users/me/a.md', title: 'A renamed', openedAt: 3 },
      { url: 'file:///Users/me/b.md', title: 'b.md', openedAt: 2 }
    ])
  })
})
