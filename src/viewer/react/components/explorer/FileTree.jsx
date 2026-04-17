import React from 'react'
import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'
import { FileRow } from './FileRow.jsx'
import { FolderRow } from './FolderRow.jsx'

export function flattenVisibleTree(nodes, expandedMap) {
  const rows = []

  function visit(list) {
    for (const node of list || []) {
      if (node?.type === 'file') {
        rows.push({
          type: 'file',
          node,
          depth: Math.max(1, Number(node.depth) || 1)
        })
        continue
      }

      const expanded = expandedMap?.get?.(node?.href) === true
      rows.push({
        type: 'folder',
        node,
        depth: Math.max(1, Number(node?.depth) || 1),
        expanded
      })

      if (expanded && Array.isArray(node?.children) && node.children.length) {
        visit(node.children)
      }
    }
  }

  visit(nodes)
  return rows
}

export function FileTree({ nodes, expandedMap, activeFileUrl, onToggleFolder, onPickFile }) {
  const activeNormalized = normalizeFileUrlForCompare(activeFileUrl || '')
  return (
    <>
      {(nodes || []).map((node) => {
        if (node.type === 'file') {
          const isActive = normalizeFileUrlForCompare(node.href || '') === activeNormalized
          return (
            <FileRow
              key={`file:${node.href}`}
              file={{ displayName: node.name, href: node.href }}
              depth={node.depth}
              isActive={isActive}
              onPick={onPickFile}
            />
          )
        }
        return (
          <FolderRow
            key={`folder:${node.href}`}
            node={node}
            expandedMap={expandedMap}
            onToggleFolder={onToggleFolder}
          >
            {expandedMap.get(node.href) === true ? (
              <FileTree
                nodes={node.children || []}
                expandedMap={expandedMap}
                activeFileUrl={activeFileUrl}
                onToggleFolder={onToggleFolder}
                onPickFile={onPickFile}
              />
            ) : null}
          </FolderRow>
        )
      })}
    </>
  )
}
