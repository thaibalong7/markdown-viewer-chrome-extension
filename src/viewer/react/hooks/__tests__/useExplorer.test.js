import { describe, expect, it } from 'vitest'
import { getInitialExplorerFileUrl } from '../useExplorer.js'

describe('getInitialExplorerFileUrl', () => {
  it('prefers the app current file url over the browser location', () => {
    expect(
      getInitialExplorerFileUrl({
        getCurrentFileUrl: () => 'file:///docs/sibling.md'
      })
    ).toBe('file:///docs/sibling.md')
  })

  it('falls back safely when the bridge has no current file url', () => {
    expect(getInitialExplorerFileUrl({ getCurrentFileUrl: () => '' })).toBe('')
  })
})
