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
