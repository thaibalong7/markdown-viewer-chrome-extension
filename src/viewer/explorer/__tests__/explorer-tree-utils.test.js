import { describe, expect, it } from 'vitest'
import {
  buildInitialExpandedMap,
  buildPreservedExpandedMap
} from '../explorer-tree-utils.js'

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
})
