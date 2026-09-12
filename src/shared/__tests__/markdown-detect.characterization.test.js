import { describe, expect, it } from 'vitest'
import {
  MARKDOWN_PATHNAME_EXT_RE,
  pathnameHasMarkdownExtension
} from '../markdown-detect.js'

describe('Markdown extension characterization', () => {
  it.each([
    '/README.md',
    '/README.MD',
    '/notes.markdown',
    '/notes.MARKDOWN',
    '/archive.mdown',
    '/config.mdc',
    '/Unicode/%E6%8C%87%E5%8D%97.md'
  ])('accepts the current Markdown-family pathname %s', (pathname) => {
    expect(pathnameHasMarkdownExtension(pathname)).toBe(true)
  })

  it.each([
    '/README.txt',
    '/README',
    '/README.md/',
    '/README.md?raw=1',
    '/README.md#intro'
  ])('rejects the non-pathname or unsupported value %s', (pathname) => {
    expect(pathnameHasMarkdownExtension(pathname)).toBe(false)
  })

  it('keeps the exported extension matcher case-insensitive and end-anchored', () => {
    expect(MARKDOWN_PATHNAME_EXT_RE.flags).toContain('i')
    expect(MARKDOWN_PATHNAME_EXT_RE.source.endsWith('$')).toBe(true)
  })
})
