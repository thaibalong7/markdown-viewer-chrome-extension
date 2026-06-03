import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getExplorerExpandedMap,
  getExplorerExpandedStateRoot,
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
})
