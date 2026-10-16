import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function createSession(overrides = {}) {
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
    showLoading: vi.fn(),
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
    navigateToFileRef: { current: vi.fn() },
    runSiblingScan: vi.fn(),
    safePatch: vi.fn(),
    stateRef: { current: { expandedMap: new Map() } },
    viewActions,
    ...overrides,
    refs: { ...refs, ...overrides.refs }
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


afterEach(() => vi.unstubAllGlobals())

it('refreshes only the workspace list without changing the route or discarding a missing document', async () => {
  const bridge = { resetBrowserRoute: vi.fn(), showToast: vi.fn(), readingPositions: { startWorkspace: vi.fn(), resume: vi.fn() } }
  const resetViewerToPickWorkspaceFile = vi.fn()
  const clearWorkspaceVirtualReaders = vi.fn()
  const session = createSession({
    bridge, resetViewerToPickWorkspaceFile, clearWorkspaceVirtualReaders,
    refs: { currentFileUrlRef: { current: 'file:///outside/current.md' } }
  })
  await session.openWorkspaceFolder('file:///workspace/', {
    listOnly: true, keepCurrentDocumentOnMissing: true, preserveExpandedState: true
  })
  expect(bridge.resetBrowserRoute).not.toHaveBeenCalled()
  expect(bridge.readingPositions.startWorkspace).not.toHaveBeenCalled()
  expect(clearWorkspaceVirtualReaders).not.toHaveBeenCalled()
  expect(resetViewerToPickWorkspaceFile).not.toHaveBeenCalled()
})

it('keeps the reading session when the folder picker is canceled', async () => {
  vi.stubGlobal('window', { showDirectoryPicker: vi.fn().mockRejectedValue(new DOMException('Canceled', 'AbortError')) })
  const readingPositions = { startWorkspace: vi.fn() }
  const session = createSession({ bridge: { readingPositions } })
  await session.pickAndOpenAnotherWorkspaceFolder()
  expect(readingPositions.startWorkspace).not.toHaveBeenCalled()
})

it('retains the workspace and bookmarks when returning to the entry is rejected', async () => {
  vi.stubGlobal('sessionStorage', { getItem: (key) => key === 'mdp:explorer:originalFile' ? 'file:///docs/index.md' : null })
  const readingPositions = { leaveWorkspace: vi.fn() }
  const clearWorkspaceVirtualReaders = vi.fn()
  const safePatch = vi.fn()
  const session = createSession({
    bridge: { readingPositions }, clearWorkspaceVirtualReaders, safePatch,
    refs: { currentFileUrlRef: { current: 'mdp-ws-file:Project%2Fa.md' } },
    navigateToFileRef: { current: vi.fn().mockResolvedValue(false) }
  })
  expect(await session.exitWorkspace()).toBe(false)
  expect(readingPositions.leaveWorkspace).not.toHaveBeenCalled()
  expect(clearWorkspaceVirtualReaders).not.toHaveBeenCalled()
  expect(safePatch).not.toHaveBeenCalled()
})

it('clears bookmarks when leaving and starts a fresh folder session after navigation', async () => {
  vi.stubGlobal('sessionStorage', { getItem: (key) => key === 'mdp:explorer:originalFile' ? 'file:///docs/index.md' : null, removeItem: vi.fn(), setItem: vi.fn() })
  const readingPositions = { leaveWorkspace: vi.fn(), resume: vi.fn() }
  const scrollTo = vi.fn()
  const currentFileUrlRef = { current: 'file:///docs/other.md' }
  const navigate = vi.fn(async () => { currentFileUrlRef.current = 'file:///docs/index.md'; return true })
  const runSiblingScan = vi.fn()
  const session = createSession({
    bridge: { readingPositions, getScrollRoot: () => ({ scrollTo }) }, runSiblingScan,
    refs: { currentFileUrlRef }, navigateToFileRef: { current: navigate }
  })
  await session.exitWorkspace()
  expect(navigate).toHaveBeenCalledWith('file:///docs/index.md', { replaceHistory: true, forceReload: false })
  expect(readingPositions.leaveWorkspace).toHaveBeenCalledOnce()
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  expect(runSiblingScan).toHaveBeenCalledWith('file:///docs/index.md')
  expect(readingPositions.resume).toHaveBeenCalledOnce()
})

it('retains the previous workspace list on refresh failure instead of falling back to another document', async () => {
  const storage = new Map()
  vi.stubGlobal('sessionStorage', { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) })
  const previousState = { view: 'tree', expandedMap: new Map() }
  const previousTree = tree('file:///workspace/')
  const safePatch = vi.fn()
  const failWorkspaceToSibling = vi.fn()
  const session = createSession({
    stateRef: { current: previousState }, safePatch, failWorkspaceToSibling,
    refs: { workspaceTreeRef: { current: previousTree } }
  })
  scanFolderRecursive.mockRejectedValueOnce(new Error('no access'))
  await expect(session.openWorkspaceFolder('file:///workspace/', { listOnly: true })).rejects.toThrow('no access')
  expect(safePatch).toHaveBeenLastCalledWith(previousState)
  expect(failWorkspaceToSibling).not.toHaveBeenCalled()
})

it('does not reset a new workspace when an older aborted scan settles after it', async () => {
  let rejectOldScan
  scanFolderRecursive.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOldScan = reject }))
  const failWorkspaceToSibling = vi.fn()
  const session = createSession({ failWorkspaceToSibling })
  const oldScan = session.openWorkspaceFolder('file:///old/')
  await session.openWorkspaceFolder('file:///new/')
  rejectOldScan(new DOMException('Canceled', 'AbortError'))
  await oldScan
  expect(failWorkspaceToSibling).not.toHaveBeenCalled()
})
