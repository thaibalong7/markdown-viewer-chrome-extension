import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAbortableScanSession } from '../explorer-scan-session.js'

const scanFolderRecursive = vi.hoisted(() => vi.fn())
const scanWorkspaceFromDirectoryHandle = vi.hoisted(() => vi.fn())
const scanWorkspaceFromWebkitFileList = vi.hoisted(() => vi.fn())

vi.mock('../folder-scanner.js', () => ({ scanFolderRecursive }))
vi.mock('../workspace-picker.js', () => ({
  pickFilesWithWebkitDirectory: vi.fn(),
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList,
  tryFileDirectoryUrlFromWebkitFiles: vi.fn()
}))

import { createExplorerWorkspaceSession } from '../explorer-workspace-session.js'

const EMPTY_STATS = {
  scannedFiles: 0,
  scannedFolders: 1,
  skippedByDepth: 0,
  hitFileLimit: false,
  hitFolderLimit: false
}

function tree(href = 'mdp-ws-dir:Workspace%2F') {
  return { type: 'folder', name: 'Workspace', href, depth: 0, children: [] }
}

function createSession() {
  const refs = {
    explorerModeRef: { current: 'sibling' },
    currentFileUrlRef: { current: '' },
    workspaceTreeRef: { current: null },
    siblingTreeRef: { current: null },
    siblingFolderLabelRef: { current: '' },
    siblingScanRootUrlRef: { current: null },
    workspaceVirtualReadersRef: { current: null }
  }
  const viewActions = {
    showProgressLoading: vi.fn(),
    updateProgressLoading: vi.fn(),
    showTree: vi.fn()
  }

  return createExplorerWorkspaceSession({
    bridge: { resetBrowserRoute: vi.fn(), showToast: vi.fn() },
    refs,
    workspaceScanSession: createAbortableScanSession(),
    siblingScanSession: { abort: vi.fn() },
    getScanLimits: () => ({
      maxScanDepth: 4,
      maxFiles: 2000,
      maxFolders: 500,
      respectGitignore: false
    }),
    buildFilesContext: vi.fn(() => null),
    clearWorkspaceVirtualReaders: vi.fn(),
    resetViewerToPickWorkspaceFile: vi.fn(),
    failWorkspaceToSibling: vi.fn(),
    setCurrentFileUrl: vi.fn(),
    navigateToFileRef: { current: vi.fn() },
    runSiblingScan: vi.fn(),
    safePatch: vi.fn(),
    stateRef: { current: { expandedMap: new Map() } },
    viewActions
  })
}

beforeEach(() => {
  scanFolderRecursive.mockReset()
  scanWorkspaceFromDirectoryHandle.mockReset()
  scanWorkspaceFromWebkitFileList.mockReset()

  scanFolderRecursive.mockResolvedValue({
    tree: tree('file:///workspace/'),
    stats: EMPTY_STATS
  })
  scanWorkspaceFromDirectoryHandle.mockResolvedValue({
    tree: tree(),
    stats: EMPTY_STATS,
    readers: new Map()
  })
  scanWorkspaceFromWebkitFileList.mockResolvedValue({
    tree: tree(),
    stats: EMPTY_STATS,
    readers: new Map()
  })
})

describe('explorer workspace behavior settings', () => {
  it('passes respectGitignore to file-listing scans', async () => {
    const session = createSession()

    await session.openWorkspaceFolder('file:///workspace/')

    expect(scanFolderRecursive).toHaveBeenCalledWith(
      'file:///workspace/',
      expect.objectContaining({ respectGitignore: false })
    )
  })

  it('passes respectGitignore to directory-handle scans', async () => {
    const session = createSession()
    const handle = { kind: 'directory', name: 'Workspace' }

    await session.openWorkspaceFromDirectoryHandle(handle)

    expect(scanWorkspaceFromDirectoryHandle).toHaveBeenCalledWith(
      handle,
      expect.objectContaining({ respectGitignore: false })
    )
  })

  it('passes respectGitignore to webkitdirectory scans', async () => {
    const session = createSession()
    const files = [{ name: 'README.md', webkitRelativePath: 'Workspace/README.md' }]

    await session.openWorkspaceFromVirtualWebkitFiles(files)

    expect(scanWorkspaceFromWebkitFileList).toHaveBeenCalledWith(
      files,
      expect.objectContaining({ respectGitignore: false })
    )
  })
})
