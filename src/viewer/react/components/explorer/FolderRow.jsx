import React from 'react'
import { Tooltip } from '../Tooltip.jsx'

export function FolderRow({ node, expandedMap, onToggleFolder, children, expanded, depth, rowStyle }) {
  const resolvedExpanded =
    typeof expanded === 'boolean' ? expanded : expandedMap?.get?.(node?.href) === true
  const resolvedDepth = Math.max(1, Number(depth ?? node?.depth) || 1)

  return (
    <li
      className="mdp-explorer__tree-folder"
      role="treeitem"
      aria-level={String(resolvedDepth)}
      data-folder-href={node.href}
      style={rowStyle}
    >
      <Tooltip content={`Expand or collapse "${node.name}".`}>
        <button
          type="button"
          className={`mdp-explorer__tree-folder-row${resolvedExpanded ? ' is-expanded' : ''}`}
          aria-expanded={resolvedExpanded ? 'true' : 'false'}
          style={{ paddingLeft: `${6 + Math.max(0, resolvedDepth - 1) * 12}px` }}
          onClick={() => onToggleFolder?.(node.href)}
        >
          <span className="mdp-explorer__tree-chevron" aria-hidden="true" />
          <span className="mdp-explorer__tree-folder-icon" aria-hidden="true">
            📁
          </span>
          <span className="mdp-explorer__tree-folder-label">{node.name}</span>
        </button>
      </Tooltip>

      {resolvedExpanded && children ? (
        <ul className="mdp-explorer__tree-children" role="group">
          {children}
        </ul>
      ) : null}
    </li>
  )
}
