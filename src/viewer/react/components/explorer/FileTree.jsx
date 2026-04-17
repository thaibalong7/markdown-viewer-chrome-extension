import React from 'react'
import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'
import { FileRow } from './FileRow.jsx'
import { FolderRow } from './FolderRow.jsx'

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
            <FileTree
              nodes={node.children || []}
              expandedMap={expandedMap}
              activeFileUrl={activeFileUrl}
              onToggleFolder={onToggleFolder}
              onPickFile={onPickFile}
            />
          </FolderRow>
        )
      })}
    </>
  )
}
