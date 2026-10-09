import React from 'react'

const TREE_INDENT_PX = 12
const TREE_ROW_INSET_PX = 2

// Row border + inner inset + half of the 10px disclosure slot.
const TREE_GUIDE_ORIGIN_PX = TREE_ROW_INSET_PX + 1 + 5

export function getTreeRowIndent(depth = 1) {
  return Math.max(0, depth - 1) * TREE_INDENT_PX
}

export function TreeGuides({ row }) {
  if (!row || (!row.guides?.length && !row.stem)) return null
  return <span className="mdp-explorer__tree-guides" aria-hidden="true">
    {row.guides.map((guide) => <span
      key={guide.level}
      className={`mdp-explorer__tree-guide${guide.branch ? ' is-branch' : ''}${guide.continues ? ' is-continuing' : ''}${guide.active ? ' is-active-path' : ''}`}
      style={{ left: `${TREE_GUIDE_ORIGIN_PX + guide.level * TREE_INDENT_PX}px` }}
    />)}
    {row.stem && <span
      className={`mdp-explorer__tree-stem${row.containsActive ? ' is-active-path' : ''}`}
      style={{ left: `${TREE_GUIDE_ORIGIN_PX + (row.depth - 1) * TREE_INDENT_PX}px` }}
    />}
  </span>
}
