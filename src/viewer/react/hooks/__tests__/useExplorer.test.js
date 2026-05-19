import { describe, expect, it } from 'vitest'
import { getInitialExplorerFileUrl, getSiblingRefreshScanOptions } from '../useExplorer.js'

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

describe('getSiblingRefreshScanOptions', () => {
  it('keeps sibling scans rooted at the original file folder for child-folder files', () => {
    expect(
      getSiblingRefreshScanOptions({
        currentFileUrl: 'file:///docs/guide/intro.md',
        originalFileUrl: 'file:///docs/index.md',
        siblingScanRootUrl: null,
        siblingFolderLabel: ''
      })
    ).toMatchObject({
      activeFileUrl: 'file:///docs/guide/intro.md',
      rootDirUrl: 'file:///docs/'
    })
  })

  it('falls back to the existing sibling scan root when current file is outside the original folder', () => {
    expect(
      getSiblingRefreshScanOptions({
        currentFileUrl: 'file:///other/readme.md',
        originalFileUrl: 'file:///docs/index.md',
        siblingScanRootUrl: 'file:///other/',
        siblingFolderLabel: '/other'
      })
    ).toEqual({
      activeFileUrl: 'file:///other/readme.md',
      rootDirUrl: 'file:///other/',
      folderLabel: '/other'
    })
  })
})
