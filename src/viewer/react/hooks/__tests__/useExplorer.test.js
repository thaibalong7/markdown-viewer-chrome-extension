import { describe, expect, it, vi } from 'vitest'
import {
  getInitialExplorerFileUrl,
  getSiblingRefreshScanOptions,
  launchInitialExplorerScan,
  resolveInitialExplorerStartup
} from '../useExplorer.js'

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
      folderLabel: '/other',
      preserveExpandedState: false
    })
  })
})

describe('resolveInitialExplorerStartup', () => {
  it('restores a stored workspace when the policy is enabled', () => {
    expect(
      resolveInitialExplorerStartup({
        storedMode: 'workspace',
        storedRoot: 'file:///docs/',
        restoreLastWorkspace: true
      })
    ).toEqual({ mode: 'workspace', workspaceRoot: 'file:///docs/' })
  })

  it('starts in sibling mode without consuming the stored workspace when restore is disabled', () => {
    const storedRoot = 'file:///docs/'
    expect(
      resolveInitialExplorerStartup({
        storedMode: 'workspace',
        storedRoot,
        restoreLastWorkspace: false
      })
    ).toEqual({ mode: 'sibling', workspaceRoot: null })
    expect(storedRoot).toBe('file:///docs/')
  })

  it('runs the sibling scan for the current document when restore is disabled', () => {
    const runSiblingScan = vi.fn()
    const openWorkspaceFolder = vi.fn()
    const siblingScanOptions = { activeFileUrl: 'file:///docs/current.md' }

    launchInitialExplorerScan({
      startup: { mode: 'sibling', workspaceRoot: null },
      initialUrl: 'file:///docs/current.md',
      siblingScanOptions,
      runSiblingScan,
      openWorkspaceFolder
    })

    expect(runSiblingScan).toHaveBeenCalledWith('file:///docs/current.md', siblingScanOptions)
    expect(openWorkspaceFolder).not.toHaveBeenCalled()
  })
})
