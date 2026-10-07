import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getExplorerExpandedMap,
  getExplorerExpandedStateRoot,
  getFilesWidthPx,
  getFilesDetailsExpanded,
  getSidebarWidthPx,
  setFilesWidthPx,
  setFilesDetailsExpanded,
  setSidebarWidthPx,
  setExplorerExpandedMap
} from '../explorer-state.js'

function createSessionStorageMock() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    })
  }
}

describe('explorer expanded folder state', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores and restores expanded state by explorer mode and root url', () => {
    setExplorerExpandedMap(
      'sibling',
      'file:///docs/',
      new Map([
        ['file:///docs/guide/', true],
        ['file:///docs/reference/', false]
      ])
    )
    setExplorerExpandedMap(
      'workspace',
      'file:///docs/',
      new Map([['file:///docs/workspace-only/', true]])
    )

    const siblingMap = getExplorerExpandedMap('sibling', 'file:///docs/')
    const workspaceMap = getExplorerExpandedMap('workspace', 'file:///docs/')

    expect(siblingMap?.get('file:///docs/guide/')).toBe(true)
    expect(siblingMap?.get('file:///docs/reference/')).toBe(false)
    expect(siblingMap?.has('file:///docs/workspace-only/')).toBe(false)
    expect(workspaceMap?.get('file:///docs/workspace-only/')).toBe(true)
  })

  it('returns null when there is no state for the root', () => {
    setExplorerExpandedMap('sibling', 'file:///docs/', new Map([['file:///docs/guide/', true]]))

    expect(getExplorerExpandedMap('sibling', 'file:///other/')).toBe(null)
  })

  it('normalizes the expanded state root from the tree href before falling back', () => {
    expect(getExplorerExpandedStateRoot({ href: 'file:///docs' }, 'file:///fallback/')).toBe('file:///docs/')
    expect(getExplorerExpandedStateRoot(null, 'file:///fallback/')).toBe('file:///fallback/')
  })

  it('stores Files and Outline widths independently', () => {
    setFilesWidthPx(312)
    setSidebarWidthPx(368)

    expect(getFilesWidthPx()).toBe(312)
    expect(getSidebarWidthPx()).toBe(368)
  })

  it('starts with Details closed and retains both choices independently of widths and folders', () => {
    expect(getFilesDetailsExpanded()).toBe(false)
    setFilesDetailsExpanded(false)
    setFilesWidthPx(312)
    setExplorerExpandedMap('workspace', 'file:///docs/', new Map([['file:///docs/guide/', true]]))
    expect(getFilesDetailsExpanded()).toBe(false)
    expect(getFilesWidthPx()).toBe(312)
    expect(getExplorerExpandedMap('workspace', 'file:///docs/')?.get('file:///docs/guide/')).toBe(true)
    setFilesDetailsExpanded(true)
    expect(getFilesDetailsExpanded()).toBe(true)
  })

  it('defaults closed for an invalid or unavailable preference', () => {
    sessionStorage.setItem('mdp:explorer:detailsExpanded', 'invalid')
    expect(getFilesDetailsExpanded()).toBe(false)
    sessionStorage.getItem.mockImplementation(() => { throw new Error('Storage unavailable') })
    expect(getFilesDetailsExpanded()).toBe(false)
  })

  it('keeps a storage failure from breaking the disclosure action', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sessionStorage.setItem.mockImplementation(() => { throw new Error('Storage unavailable') })
    expect(() => setFilesDetailsExpanded(false)).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.any(String), 'Could not save Files details preference for this tab')
    warn.mockRestore()
  })
})
