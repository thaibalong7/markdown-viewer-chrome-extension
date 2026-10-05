import { describe, expect, it, vi } from 'vitest'
import { getFileListRefreshUnavailableReason, refreshExplorerFileList } from '../explorer-list-refresh.js'

function harness(extra = {}) {
  return {
    currentFileUrl: 'file:///docs/current.md', mode: 'sibling',
    siblingScanOptions: { rootDirUrl: 'file:///docs/', preserveExpandedState: true },
    runSiblingScan: vi.fn(), workspaceSession: { openWorkspaceFolder: vi.fn() },
    showToast: vi.fn(), ...extra
  }
}

describe('file-list refresh ownership', () => {
  it('rescans siblings while leaving document, draft and navigation untouched', async () => {
    const h = harness({ openDocument: vi.fn(), navigateToFile: vi.fn(), prepareForDocumentSwitch: vi.fn() })
    expect(await refreshExplorerFileList(h)).toBe(true)
    expect(h.runSiblingScan).toHaveBeenCalledWith(h.currentFileUrl, h.siblingScanOptions)
    expect(h.openDocument).not.toHaveBeenCalled()
    expect(h.navigateToFile).not.toHaveBeenCalled()
    expect(h.prepareForDocumentSwitch).not.toHaveBeenCalled()
  })

  it('refreshes a workspace without requiring an open document and explicitly preserves it', async () => {
    const h = harness({ mode: 'workspace', workspaceRootUrl: 'file:///docs/', currentFileUrl: '' })
    await refreshExplorerFileList(h)
    expect(h.workspaceSession.openWorkspaceFolder).toHaveBeenCalledWith('file:///docs/', {
      restore: true, preserveExpandedState: true, keepCurrentDocumentOnMissing: true, listOnly: true
    })
    expect(h.runSiblingScan).not.toHaveBeenCalled()
  })

  it('does not report success or fall back to the entry document when a scan is canceled', async () => {
    const h = harness({ mode: 'workspace', workspaceRootUrl: 'file:///docs/', navigateToFile: vi.fn() })
    h.workspaceSession.openWorkspaceFolder.mockResolvedValue(false)
    expect(await refreshExplorerFileList(h)).toBe(false)
    expect(h.showToast).not.toHaveBeenCalled()
    expect(h.navigateToFile).not.toHaveBeenCalled()
  })

  it('surfaces list failures without changing documents', async () => {
    const h = harness()
    h.runSiblingScan.mockRejectedValue(new Error('access denied'))
    expect(await refreshExplorerFileList(h)).toBe(false)
    expect(h.showToast).toHaveBeenCalledWith(expect.stringContaining('open document was kept'), { variant: 'error' })
  })

  it('explains reselecting a handle/snapshot workspace instead of pretending it can rescan', () => {
    expect(getFileListRefreshUnavailableReason({ mode: 'workspace', workspaceRootUrl: null })).toContain('Select the folder again')
    expect(getFileListRefreshUnavailableReason({ mode: 'workspace', workspaceRootUrl: 'file:///docs/' })).toBe('')
  })
})


it('keeps a canceled sibling rescan quiet', async () => {
  const h = harness()
  h.runSiblingScan.mockResolvedValue(false)
  expect(await refreshExplorerFileList(h)).toBe(false)
  expect(h.showToast).not.toHaveBeenCalled()
})
