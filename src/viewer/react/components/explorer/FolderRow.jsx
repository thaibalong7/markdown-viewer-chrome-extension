import React from 'react'
import { Tooltip } from '../Tooltip.jsx'

export function FolderRow({ node, expandedMap, onToggleFolder, children }) {
  const expanded = expandedMap.get(node.href) === true

  return (
    <li
      className="mdp-explorer__tree-folder"
      role="treeitem"
      aria-level={String(Math.max(1, node.depth))}
      data-folder-href={node.href}
    >
      <Tooltip content={`Expand or collapse "${node.name}".`}>
        <button
          type="button"
          className={`mdp-explorer__tree-folder-row${expanded ? ' is-expanded' : ''}`}
          aria-expanded={expanded ? 'true' : 'false'}
          style={{ paddingLeft: `${6 + Math.max(0, node.depth - 1) * 12}px` }}
          onClick={() => onToggleFolder?.(node.href)}
        >
          <span className="mdp-explorer__tree-chevron" aria-hidden="true" />
          <span className="mdp-explorer__tree-folder-icon" aria-hidden="true">
            📁
          </span>
          <span className="mdp-explorer__tree-folder-label">{node.name}</span>
        </button>
      </Tooltip>

      <ul className="mdp-explorer__tree-children" role="group" hidden={!expanded}>
        {children}
      </ul>
    </li>
  )
}
