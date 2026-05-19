import { describe, expect, it, vi } from 'vitest'
import { createExplorerActions } from '../useExplorerActions.js'

function createActions(overrides = {}) {
  return createExplorerActions({
    navigateToFileRef: { current: vi.fn() },
    pickAndOpenAnotherWorkspaceFolder: vi.fn(),
    exitWorkspace: vi.fn(),
    refreshCurrentFileAndList: vi.fn(),
    backActionRef: { current: vi.fn() },
    workspaceScanSession: { abort: vi.fn() },
    siblingScanSession: { abort: vi.fn() },
    dispatch: vi.fn(),
    ...overrides
  })
}

describe('createExplorerActions', () => {
  it('does not mark a clicked file active before navigation succeeds', () => {
    const navigateToFile = vi.fn()
    const safePatch = vi.fn()
    const actions = createActions({
      navigateToFileRef: { current: navigateToFile },
      safePatch
    })

    actions.onNavigate('file:///docs/empty.md')

    expect(navigateToFile).toHaveBeenCalledWith('file:///docs/empty.md')
    expect(safePatch).not.toHaveBeenCalled()
  })
})
