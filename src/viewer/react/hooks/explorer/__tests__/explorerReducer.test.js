import { describe, expect, it } from 'vitest'
import { createInitialState, explorerReducer } from '../explorerReducer.js'

describe('explorerReducer', () => {
  it('collapses unrelated folders while retaining the active file path', () => {
    const state = {
      ...createInitialState(),
      activeFileUrl: 'file:///docs/guide/deep/a.md',
      tree: {
        type: 'folder',
        href: 'file:///docs/',
        children: [
          {
            type: 'folder',
            href: 'file:///docs/guide/',
            children: [
              {
                type: 'folder',
                href: 'file:///docs/guide/deep/',
                children: [{ type: 'file', href: 'file:///docs/guide/deep/a.md' }]
              }
            ]
          },
          {
            type: 'folder',
            href: 'file:///docs/reference/',
            children: [{ type: 'file', href: 'file:///docs/reference/api.md' }]
          }
        ]
      },
      expandedMap: new Map([
        ['file:///docs/guide/', true],
        ['file:///docs/guide/deep/', true],
        ['file:///docs/reference/', true]
      ])
    }

    const nextState = explorerReducer(state, { type: 'COLLAPSE_ALL_FOLDERS' })

    expect(nextState.expandedMap).not.toBe(state.expandedMap)
    expect(Array.from(nextState.expandedMap.entries())).toEqual([
      ['file:///docs/guide/', true],
      ['file:///docs/guide/deep/', true],
      ['file:///docs/reference/', false]
    ])

    const fullyCollapsedState = explorerReducer(nextState, { type: 'COLLAPSE_ALL_FOLDERS' })

    expect(Array.from(fullyCollapsedState.expandedMap.values())).toEqual([false, false, false])
  })
})
