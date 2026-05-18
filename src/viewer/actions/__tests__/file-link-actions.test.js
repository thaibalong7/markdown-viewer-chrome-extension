import { describe, expect, it } from 'vitest'
import { buildCurrentFileLink } from '../file-link-actions.js'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'

describe('buildCurrentFileLink', () => {
  it('returns empty string when current file URL is missing', () => {
    expect(buildCurrentFileLink('', 'file:///Users/me/docs/a.md#intro')).toBe('')
    expect(buildCurrentFileLink('   ', 'file:///Users/me/docs/a.md#intro')).toBe('')
  })

  it('keeps workspace virtual hrefs unchanged', () => {
    const href = `${MDP_WS_FILE}docs%2FREADME.md`
    expect(buildCurrentFileLink(href, 'file:///Users/me/docs/README.md#intro')).toBe(href)
  })

  it('uses browser href when it points to the same file so hashes are preserved', () => {
    expect(
      buildCurrentFileLink(
        'file:///Users/me/docs/README.md',
        'file:///Users/me/docs/README.md#usage'
      )
    ).toBe('file:///Users/me/docs/README.md#usage')
  })

  it('falls back to current file URL when browser href points elsewhere', () => {
    expect(
      buildCurrentFileLink(
        'file:///Users/me/docs/README.md',
        'file:///Users/me/docs/OTHER.md#usage'
      )
    ).toBe('file:///Users/me/docs/README.md')
  })

  it('normalizes encoded and decoded equivalent file URLs before preserving browser hash', () => {
    expect(
      buildCurrentFileLink(
        'file:///Users/me/docs/My%20Notes.md',
        'file:///Users/me/docs/My%20Notes.md#section'
      )
    ).toBe('file:///Users/me/docs/My%20Notes.md#section')
  })
})
