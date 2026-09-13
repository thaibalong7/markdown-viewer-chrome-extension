import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createExplorerNavigator, updateUrlWithoutReload } from '../explorer-navigation.js'

const HTMLElementStub = class HTMLElement {}

beforeEach(() => {
  vi.stubGlobal('HTMLElement', HTMLElementStub)
  vi.stubGlobal('document', { title: '' })
  vi.stubGlobal('window', {
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn()
    }
  })
})

describe('current Markdown navigation characterization', () => {
  it('loads, renders, updates history/title, and refreshes explorer state', async () => {
    const bridge = {
      openDocument: vi.fn().mockResolvedValue(true),
      setSmoothInitialHashScroll: vi.fn(),
      showToast: vi.fn(),
      getArticleEl: () => null,
      getScrollRoot: () => null,
      getEntryFileUrl: () => 'file:///fixtures/navigation/index.md'
    }
    const refs = {
      explorerModeRef: { current: 'siblings' },
      currentFileUrlRef: { current: 'file:///fixtures/navigation/index.md' },
      siblingTreeRef: { current: null },
      siblingScanRootUrlRef: { current: null }
    }
    const runSiblingScan = vi.fn().mockResolvedValue(undefined)
    const navigator = createExplorerNavigator({
      bridge,
      refs,
      stateRef: { current: { expandedMap: {} } },
      safePatch: vi.fn(),
      buildFilesContext: vi.fn(),
      setCurrentFileUrl(nextUrl) {
        refs.currentFileUrlRef.current = nextUrl
      },
      runSiblingScan,
      syncExplorerBackButton: vi.fn()
    })

    const opened = await navigator.navigateToFile(
      'file:///fixtures/navigation/Guide%20Notes.markdown'
    )

    expect(opened).toBe(true)
    expect(bridge.openDocument).toHaveBeenCalledWith(
      'file:///fixtures/navigation/Guide%20Notes.markdown',
      { forceReload: false }
    )
    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      'file:///fixtures/navigation/index.md?f=Guide%20Notes.markdown'
    )
    expect(document.title).toBe('Guide Notes - Markdown Plus')
    expect(runSiblingScan).toHaveBeenCalledWith(
      'file:///fixtures/navigation/Guide%20Notes.markdown'
    )
  })

  it('keeps pushState and replaceState behavior separate for Back/Forward support', () => {
    updateUrlWithoutReload('file:///fixtures/navigation/index.md', {
      entryFileUrl: 'file:///fixtures/navigation/index.md'
    })
    updateUrlWithoutReload('file:///fixtures/navigation/Guide%20Notes.markdown', {
      entryFileUrl: 'file:///fixtures/navigation/index.md',
      replace: true,
      hash: 'cài-đặt'
    })

    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      'file:///fixtures/navigation/index.md'
    )
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      'file:///fixtures/navigation/index.md?f=Guide%20Notes.markdown#c%C3%A0i-%C4%91%E1%BA%B7t'
    )
  })

  it('does not update the browser URL when navigating inside a workspace', async () => {
    const bridge = {
      openDocument: vi.fn().mockResolvedValue(true),
      setSmoothInitialHashScroll: vi.fn(),
      getArticleEl: () => null,
      getScrollRoot: () => null,
      getEntryFileUrl: () => 'file:///fixtures/navigation/index.md'
    }
    const refs = {
      explorerModeRef: { current: 'workspace' },
      currentFileUrlRef: { current: 'file:///fixtures/navigation/index.md' },
      workspaceTreeRef: { current: null }
    }
    const navigator = createExplorerNavigator({
      bridge,
      refs,
      stateRef: { current: { expandedMap: {} } },
      safePatch: vi.fn(),
      buildFilesContext: vi.fn(),
      setCurrentFileUrl(nextUrl) {
        refs.currentFileUrlRef.current = nextUrl
      },
      runSiblingScan: vi.fn(),
      syncExplorerBackButton: vi.fn()
    })

    await expect(
      navigator.navigateToFile('file:///fixtures/navigation/docs/guide.md')
    ).resolves.toBe(true)

    expect(window.history.pushState).not.toHaveBeenCalled()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })
})
