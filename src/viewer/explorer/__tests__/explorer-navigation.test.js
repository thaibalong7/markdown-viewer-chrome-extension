import { describe, expect, it } from 'vitest'
import {
  shouldReuseSiblingTreeAfterNavigation,
  workspaceDocumentStillValid
} from '../explorer-navigation.js'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'

describe('explorer navigation decisions', () => {
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
