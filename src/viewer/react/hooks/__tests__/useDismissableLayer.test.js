import { describe, expect, it, vi } from 'vitest'
import { eventIncludesNode, getDismissEventTargets } from '../useDismissableLayer.js'

describe('useDismissableLayer helpers', () => {
  it('registers both the node root and owner document when they differ', () => {
    const root = { addEventListener: vi.fn() }
    const ownerDocument = { addEventListener: vi.fn() }
    const node = {
      ownerDocument,
      getRootNode: () => root
    }

    expect(getDismissEventTargets(node)).toEqual([root, ownerDocument])
  })

  it('uses composedPath to detect events inside a layer', () => {
    const node = {}
    expect(
      eventIncludesNode(
        {
          composedPath: () => [{}, node, {}],
          target: {}
        },
        node
      )
    ).toBe(true)
  })

  it('falls back to contains when composedPath is unavailable', () => {
    const target = {}
    const node = {
      contains: vi.fn((candidate) => candidate === target)
    }

    expect(eventIncludesNode({ target }, node)).toBe(true)
    expect(node.contains).toHaveBeenCalledWith(target)
  })
})
