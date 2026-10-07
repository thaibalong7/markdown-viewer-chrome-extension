import { describe, expect, it, vi } from 'vitest'
import { createExplorerViewActions } from '../createExplorerViewActions.js'

function createHarness(actionsMode = 'sibling') {
  const stateRef = {
    current: {
      actionsMode,
      filesContext: null,
      progressHeadline: 'Scanning workspace…'
    }
  }
  const safePatch = vi.fn((payload) => {
    stateRef.current = { ...stateRef.current, ...payload }
  })
  const actions = createExplorerViewActions({
    stateRef,
    safePatch,
    setBackNavigation: vi.fn(),
    currentFileUrlRef: { current: 'file:///docs/current.md' }
  })

  return { actions, safePatch }
}

describe('createExplorerViewActions loading state', () => {
  it('keeps the full decoded folder path for tree location tooltips', () => {
    const { actions, safePatch } = createHarness()
    const path = `/Users/person/${'long-folder/'.repeat(8)}project docs`
    actions.showTree({
      type: 'folder', name: 'project docs', href: `file://${encodeURI(path)}/`, children: []
    }, { workspaceLabel: 'project docs', actionsMode: 'sibling' })
    expect(safePatch).toHaveBeenLastCalledWith(expect.objectContaining({
      summaryDirectoryLabel: path
    }))
  })

  it('updates the action mode and root label when a workspace scan begins', () => {
    const { actions, safePatch } = createHarness('sibling')
    actions.showProgressLoading({
      scannedFiles: 0, scannedFolders: 0, currentFolder: 'file:///new%20workspace/',
      filesContext: { modeBadge: 'workspace' }
    })
    expect(safePatch).toHaveBeenLastCalledWith(expect.objectContaining({
      actionsMode: 'workspace', summaryDirectoryLabel: '/new workspace/'
    }))
    actions.updateProgressLoading({ scannedFiles: 4, scannedFolders: 2, currentFolder: 'file:///new%20workspace/child/' })
    expect(safePatch).toHaveBeenLastCalledWith(expect.not.objectContaining({ summaryDirectoryLabel: expect.anything() }))
  })

  it('restores Folder mode and the current document location when leaving a workspace', () => {
    const { actions, safePatch } = createHarness('workspace')
    actions.showLoading({ filesContext: { modeBadge: 'folder' } })
    expect(safePatch).toHaveBeenLastCalledWith(expect.objectContaining({
      actionsMode: 'sibling', summaryDirectoryLabel: '/docs'
    }))
  })

  it('preserves the current action layout for the skeleton view', () => {
    const { actions, safePatch } = createHarness('sibling')

    actions.showLoading()

    expect(safePatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'loading', actionsMode: 'sibling' })
    )
  })

  it('preserves the current action layout while scan progress is shown', () => {
    const { actions, safePatch } = createHarness('workspace')

    actions.showProgressLoading({ scannedFiles: 0, scannedFolders: 0 })

    expect(safePatch).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ actionsMode: expect.anything() })
    )
  })
})
