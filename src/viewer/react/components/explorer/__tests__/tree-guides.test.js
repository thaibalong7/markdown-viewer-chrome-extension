import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { flattenVisibleTree } from '../FileTree.jsx'
import { TreeGuides } from '../TreeGuides.jsx'

const file = (name, depth) => ({ type: 'file', name, depth, href: `mdp-ws-file:${name}` })
const folder = (name, depth, children) => ({ type: 'folder', name, depth, href: `mdp-ws-dir:${name}`, children })
const tree = [folder('docs', 1, [
  folder('design', 2, [file('buttons.md', 3), file('tree.md', 3)]),
  file('guide.md', 2)
]), file('README.md', 1)]
const expanded = new Map([['mdp-ws-dir:docs', true], ['mdp-ws-dir:design', true]])

describe('virtual Files hierarchy guides', () => {
  it('counts hidden descendants and preserves counts on collapse', () => {
    const open = flattenVisibleTree(tree, expanded)
    const closed = flattenVisibleTree(tree, new Map())
    expect(open[0].fileCount).toBe(3)
    expect(open[1].fileCount).toBe(2)
    expect(closed).toHaveLength(2)
    expect(closed[0].fileCount).toBe(3)
    expect(closed[0].stem).toBe(false)
  })

  it('carries ancestor continuations even if the folder row is outside the virtual viewport', () => {
    const rows = flattenVisibleTree(tree, expanded, 'mdp-ws-file:tree.md')
    const activeRow = rows.find(row => row.node.name === 'tree.md')
    expect(activeRow.path).toBe('docs/design/tree.md')
    expect(activeRow.guides).toEqual([
      { level: 0, branch: false, continues: true, active: true },
      { level: 1, branch: true, continues: false, active: true }
    ])
    const html = renderToStaticMarkup(React.createElement(TreeGuides, { row: activeRow }))
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('left:8px')
    expect(html).toContain('left:20px')
    expect(html).toContain('is-branch is-active-path')
  })

  it('terminates the last sibling and does not connect separate root nodes', () => {
    const rows = flattenVisibleTree(tree, expanded)
    expect(rows.at(-1).guides).toEqual([])
    expect(rows.find(row => row.node.name === 'guide.md').guides).toEqual([
      { level: 0, branch: true, continues: false, active: false }
    ])
    expect(renderToStaticMarkup(React.createElement(TreeGuides, { row: rows.at(-1) }))).toBe('')
  })

  it('ends ancestor lanes below a last folder while keeping that folder’s own children connected', () => {
    const rows = flattenVisibleTree([folder('root', 1, [folder('last', 2, [file('a.md', 3)])])],
      new Map([['mdp-ws-dir:root', true], ['mdp-ws-dir:last', true]]))
    expect(rows.at(-1).guides[0].continues).toBe(false)
    expect(rows.at(-1).guides[1]).toMatchObject({ branch: true, continues: false })
    expect(rows[1].stem).toBe(true)
  })

  it('matches real-file active identities after URL normalization', () => {
    const rows = flattenVisibleTree([folder('root', 1, [
      { ...file('a b.md', 2), href: 'file:///docs/a%20b.md' }
    ])], new Map(), 'file:///docs/a%20b.md#heading')
    expect(rows[0].containsActive).toBe(true)
  })
})
