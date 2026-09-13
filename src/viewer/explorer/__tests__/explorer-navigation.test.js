import { describe, expect, it, vi } from 'vitest'
import {
  navigateFromBrowserHistory,
  shouldReuseSiblingTreeAfterNavigation,
  workspaceDocumentStillValid
} from '../explorer-navigation.js'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'

describe('explorer navigation decisions', () => {
  it('reopens a history target without creating another history entry', async () => {
    const navigateToFile = vi.fn().mockResolvedValue(true)

    await expect(navigateFromBrowserHistory({
      locationHref: 'file:///docs/readme.md?f=notes.txt#details',
      currentFileUrl: 'file:///docs/readme.md',
      entryFileUrl: 'file:///docs/readme.md',
      navigateToFile
    })).resolves.toBe(true)

    expect(navigateToFile).toHaveBeenCalledWith('file:///docs/notes.txt', {
      hash: 'details',
      updateHistory: false
    })
  })

  it('restores the current URL when dirty-state confirmation rejects history navigation', async () => {
    const restoreUrl = vi.fn()

    await expect(navigateFromBrowserHistory({
      locationHref: 'file:///docs/readme.md?f=notes.txt',
      currentFileUrl: 'file:///docs/readme.md',
      entryFileUrl: 'file:///docs/readme.md',
      navigateToFile: vi.fn().mockResolvedValue(false),
      restoreUrl
    })).resolves.toBe(false)

    expect(restoreUrl).toHaveBeenCalledWith('file:///docs/readme.md', {
      entryFileUrl: 'file:///docs/readme.md',
      replace: false
    })
  })

  it('does not restore a stale rejected target after a newer history navigation starts', async () => {
    const restoreUrl = vi.fn()

    await navigateFromBrowserHistory({
      locationHref: 'file:///docs/readme.md?f=notes.txt',
      currentFileUrl: 'file:///docs/readme.md',
      navigateToFile: vi.fn().mockResolvedValue(false),
      getLocationHref: () => 'file:///docs/readme.md?f=photo.png',
      restoreUrl
    })

    expect(restoreUrl).not.toHaveBeenCalled()
  })

  it('reuses a sibling tree when the navigated file remains under the scanned root', () => {
    const siblingTree = { type: 'folder', href: 'file:///docs/', children: [] }

    expect(
      shouldReuseSiblingTreeAfterNavigation({
        currentFileUrl: 'file:///docs/guide/intro.md',
        siblingTree,
        siblingScanRootUrl: 'file:///docs/'
      })
    ).toBe(true)
  })

  it('requests a sibling rescan when navigation leaves the scanned root', () => {
    const siblingTree = { type: 'folder', href: 'file:///docs/', children: [] }

    expect(
      shouldReuseSiblingTreeAfterNavigation({
        currentFileUrl: 'file:///other/readme.md',
        siblingTree,
        siblingScanRootUrl: 'file:///docs/'
      })
    ).toBe(false)
  })

  it('keeps a workspace virtual document only when it exists in the workspace tree', () => {
    const href = `${MDP_WS_FILE}${encodeURIComponent('Project/docs/readme.md')}`
    const tree = {
      type: 'folder',
      href: 'mdp-ws-dir:Project%2F',
      children: [
        {
          type: 'folder',
          href: 'mdp-ws-dir:Project%2Fdocs%2F',
          children: [{ type: 'file', href, children: [] }]
        }
      ]
    }

    expect(workspaceDocumentStillValid({ currentFileUrl: href, tree, rootForInject: '' })).toBe(true)
    expect(
      workspaceDocumentStillValid({
        currentFileUrl: `${MDP_WS_FILE}${encodeURIComponent('Project/missing.md')}`,
        tree,
        rootForInject: ''
      })
    ).toBe(false)
  })

  it('keeps a file document only while it is under the file workspace root', () => {
    const tree = { type: 'folder', href: 'file:///docs/', children: [] }

    expect(
      workspaceDocumentStillValid({
        currentFileUrl: 'file:///docs/readme.md',
        tree,
        rootForInject: 'file:///docs/'
      })
    ).toBe(true)
    expect(
      workspaceDocumentStillValid({
        currentFileUrl: 'file:///other/readme.md',
        tree,
        rootForInject: 'file:///docs/'
      })
    ).toBe(false)
  })
})
