import { describe, expect, it } from 'vitest'
import { getDocumentStats } from '../document-stats.js'

describe('document statistics', () => {
  it('counts readable words without treating Markdown punctuation as words', () => {
    expect(getDocumentStats('# Hello, **Markdown Plus**!')).toMatchObject({
      wordCount: 3,
      readingMinutes: 1
    })
  })

  it('rounds estimated reading time up at 200 words per minute', () => {
    const source = Array.from({ length: 401 }, (_, index) => `word${index}`).join(' ')

    expect(getDocumentStats(source).readingMinutes).toBe(3)
  })

  it('counts Unicode code points and includes whitespace in the character total', () => {
    expect(getDocumentStats('Hi 👋')).toMatchObject({
      wordCount: 1,
      characterCount: 4,
      readingMinutes: 1
    })
  })

  it('returns zeroed statistics for missing content', () => {
    expect(getDocumentStats(null)).toEqual({
      wordCount: 0,
      characterCount: 0,
      readingMinutes: 0
    })
  })
})
