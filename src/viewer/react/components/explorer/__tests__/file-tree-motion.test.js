import { describe, expect, it } from 'vitest'
import { buildTreeMotionPlan, getTreeRowKey } from '../FileTree.jsx'

const folder = (href, depth = 1, expanded = false) => ({
  type: 'folder',
  node: { href, name: href, depth },
  depth,
  expanded
})

const file = (href, depth = 1) => ({
  type: 'file',
  node: { href, name: href, depth },
  depth
})

describe('Files tree motion planning', () => {
  it('keeps stable row identities and snapshots only rendered rows that leave on collapse', () => {
    const currentRows = [
      folder('/assets', 1, true),
      file('/assets/logo.svg', 2),
      folder('/assets/icons', 2, true),
      file('/assets/icons/menu.svg', 3),
      file('/README.md', 1)
    ]
    const nextRows = [folder('/assets', 1, false), file('/README.md', 1)]
    const plan = buildTreeMotionPlan(currentRows, nextRows, [
      { index: 0, start: 0 },
      { index: 1, start: 38 },
      { index: 2, start: 76 },
      { index: 4, start: 152 }
    ])

    expect(plan.active).toBe(true)
    expect([...plan.enteringKeys]).toEqual([])
    expect(plan.exitingRows.map(({ key, start }) => ({ key, start }))).toEqual([
      { key: 'file:/assets/logo.svg', start: 38 },
      { key: 'folder:/assets/icons', start: 76 }
    ])
    expect(getTreeRowKey(nextRows[1])).toBe('file:/README.md')
  })

  it('marks newly revealed descendants for the expand animation', () => {
    const currentRows = [folder('/assets'), file('/README.md')]
    const nextRows = [
      folder('/assets', 1, true),
      file('/assets/logo.svg', 2),
      file('/README.md')
    ]
    const plan = buildTreeMotionPlan(currentRows, nextRows, [
      { index: 0, start: 0 },
      { index: 1, start: 38 }
    ])

    expect(plan.active).toBe(true)
    expect([...plan.enteringKeys]).toEqual(['file:/assets/logo.svg'])
    expect(plan.exitingRows).toEqual([])
  })
})
