import { describe, expect, it } from 'vitest'
import {
  buildCollapsedExpandedMap,
  buildInitialExpandedMap,
  buildPreservedExpandedMap
} from '../explorer-tree-utils.js'
import { normalizeFileUrlForCompare } from '../url-utils.js'

function folder(href, depth, children = []) {
  return { type: 'folder', href, depth, children }
}

function file(href) {
  return { type: 'file', href }
}

describe('explorer tree expanded state', () => {
  it('builds the initial tree with top-level folders expanded', () => {
    const map = buildInitialExpandedMap([
      folder('file:///docs/guide/', 1, [folder('file:///docs/guide/deep/', 2)])
    ])

    expect(map.get('file:///docs/guide/')).toBe(true)
    expect(map.get('file:///docs/guide/deep/')).toBe(false)
  })

  it('preserves existing folder states, prunes deleted folders, and collapses new folders', () => {
    const previous = new Map([
      ['file:///docs/guide/', true],
      ['file:///docs/guide/deep/', true],
      ['file:///docs/deleted/', true],
      ['file:///docs/reference/', false]
    ])

    const map = buildPreservedExpandedMap(
      [
        folder('file:///docs/guide/', 1, [
          folder('file:///docs/guide/deep/', 2, [file('file:///docs/guide/deep/a.md')]),
          folder('file:///docs/guide/new/', 2)
        ]),
        folder('file:///docs/reference/', 1)
      ],
      previous
    )

    expect(map.get('file:///docs/guide/')).toBe(true)
    expect(map.get('file:///docs/guide/deep/')).toBe(true)
    expect(map.get('file:///docs/reference/')).toBe(false)
    expect(map.get('file:///docs/guide/new/')).toBe(false)
    expect(map.has('file:///docs/deleted/')).toBe(false)
  })

  it('collapses unrelated folders while keeping the active file ancestors expanded', () => {
    const nodes = [
      folder('file:///docs/guide/', 1, [
        folder('file:///docs/guide/deep/', 2, [file('file:///docs/guide/deep/a.md')])
      ]),
      folder('file:///docs/reference/', 1, [file('file:///docs/reference/api.md')])
    ]
    const current = new Map([
      ['file:///docs/guide/', true],
      ['file:///docs/guide/deep/', true],
      ['file:///docs/reference/', true]
    ])

    const map = buildCollapsedExpandedMap(
      nodes,
      'file:///docs/guide/deep/a.md',
      current,
      normalizeFileUrlForCompare
    )

    expect(map.get('file:///docs/guide/')).toBe(true)
    expect(map.get('file:///docs/guide/deep/')).toBe(true)
    expect(map.get('file:///docs/reference/')).toBe(false)
  })

  it('collapses the active file ancestors on the second collapse', () => {
    const nodes = [
      folder('file:///docs/guide/', 1, [
        folder('file:///docs/guide/deep/', 2, [file('file:///docs/guide/deep/a.md')])
      ])
    ]
    const activePathOnly = new Map([
      ['file:///docs/guide/', true],
      ['file:///docs/guide/deep/', true]
    ])

    const map = buildCollapsedExpandedMap(
      nodes,
      'file:///docs/guide/deep/a.md',
      activePathOnly,
      normalizeFileUrlForCompare
    )

    expect(Array.from(map.values())).toEqual([false, false])
  })
})
