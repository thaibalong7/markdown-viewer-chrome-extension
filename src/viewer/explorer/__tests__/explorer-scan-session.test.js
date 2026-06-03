import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAbortableScanSession,
  createSiblingScanRunner,
  isAbortError,
  throwIfAborted
} from '../explorer-scan-session.js'
import { scanFolderRecursive } from '../folder-scanner.js'

vi.mock('../folder-scanner.js', () => ({
  scanFolderRecursive: vi.fn()
}))

beforeEach(() => {
  vi.mocked(scanFolderRecursive).mockReset()
})

describe('explorer scan session', () => {
  it('aborts the previous scan when a new scan starts', () => {
    const session = createAbortableScanSession()
    const first = session.start()
    expect(first.aborted).toBe(false)

    const second = session.start()
    expect(first.aborted).toBe(true)
    expect(second.aborted).toBe(false)
    expect(session.currentSignal()).toBe(second)
  })

  it('clears only the active signal', () => {
    const session = createAbortableScanSession()
    const first = session.start()
    const second = session.start()

    session.clear(first)
    expect(session.currentSignal()).toBe(second)

    session.clear(second)
    expect(session.currentSignal()).toBe(null)
  })

  it('throws AbortError for aborted signals', () => {
    const controller = new AbortController()
    controller.abort()

    expect(() => throwIfAborted(controller.signal)).toThrow(/cancelled/i)
    try {
      throwIfAborted(controller.signal)
    } catch (error) {
      expect(isAbortError(error, controller.signal)).toBe(true)
      expect(error.name).toBe('AbortError')
    }
  })

  it('preserves the expanded-state option when finalizing a deep sibling refresh', async () => {
    const tree = {
      type: 'folder',
      href: 'file:///docs/',
      name: 'docs',
      depth: 0,
      children: [
        {
          type: 'folder',
          href: 'file:///docs/guide/',
          name: 'guide',
          depth: 1,
          children: [
            {
              type: 'file',
              href: 'file:///docs/guide/intro.md',
              name: 'intro.md',
              depth: 2
            }
          ]
        }
      ]
    }
    const stats = {
      scannedFiles: 1,
      scannedFolders: 2,
      skippedByDepth: 0,
      hitFileLimit: false,
      hitFolderLimit: false
    }
    vi.mocked(scanFolderRecursive).mockResolvedValue({ tree, stats })
    const finalizeSiblingTreePresent = vi.fn()
    const runSiblingScan = createSiblingScanRunner({
      scanSession: createAbortableScanSession(),
      refs: {
        siblingTreeRef: { current: null },
        siblingFolderLabelRef: { current: '' },
        siblingScanRootUrlRef: { current: null }
      },
      getScanLimits: () => ({ maxScanDepth: 4, maxFiles: 100, maxFolders: 100 }),
      buildFilesContext: () => null,
      siblingBackNavigationForUrl: () => ({ showBack: false }),
      finalizeSiblingTreePresent,
      viewActions: {
        showProgressLoading: vi.fn(),
        updateProgressLoading: vi.fn(),
        showEmpty: vi.fn(),
        showFiles: vi.fn()
      }
    })

    await runSiblingScan('file:///docs/guide/intro.md', {
      activeFileUrl: 'file:///docs/guide/intro.md',
      rootDirUrl: 'file:///docs/',
      preserveExpandedState: true
    })

    expect(finalizeSiblingTreePresent).toHaveBeenCalledWith(
      tree,
      stats,
      expect.objectContaining({
        maxScanDepth: 4,
        preserveExpandedState: true
      })
    )
  })
})
