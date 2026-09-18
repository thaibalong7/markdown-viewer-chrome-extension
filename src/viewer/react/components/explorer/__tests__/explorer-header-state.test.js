import { describe, expect, it } from 'vitest'
import { getExplorerHeaderButtonState } from '../explorer-header-state.js'

describe('getExplorerHeaderButtonState', () => {
  it('enables Leave Workspace and hides Back in workspace mode', () => {
    expect(
      getExplorerHeaderButtonState({ actionsMode: 'workspace', showBack: false })
    ).toEqual({
      openFolderDisabled: false,
      leaveWorkspaceHidden: false,
      leaveWorkspaceDisabled: false,
      backHidden: true,
      backDisabled: true
    })
  })

  it('disables Back at the original file in sibling mode', () => {
    expect(
      getExplorerHeaderButtonState({ actionsMode: 'sibling', showBack: false })
    ).toEqual({
      openFolderDisabled: false,
      leaveWorkspaceHidden: true,
      leaveWorkspaceDisabled: false,
      backHidden: false,
      backDisabled: true
    })
  })

  it('enables Back after navigating away from the original file', () => {
    expect(
      getExplorerHeaderButtonState({ actionsMode: 'sibling', showBack: true })
    ).toEqual({
      openFolderDisabled: false,
      leaveWorkspaceHidden: true,
      leaveWorkspaceDisabled: false,
      backHidden: false,
      backDisabled: false
    })
  })

  it('keeps visible navigation actions disabled while the explorer is busy', () => {
    expect(
      getExplorerHeaderButtonState({
        actionsMode: 'sibling',
        showBack: true,
        actionsDisabled: true
      })
    ).toEqual({
      openFolderDisabled: true,
      leaveWorkspaceHidden: true,
      leaveWorkspaceDisabled: true,
      backHidden: false,
      backDisabled: true
    })
  })
})
