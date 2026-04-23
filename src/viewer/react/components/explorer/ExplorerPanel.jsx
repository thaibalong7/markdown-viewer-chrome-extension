import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'
import { SkeletonBlock } from '../../../../shared/react/Skeleton.jsx'
import { useExplorer } from '../../hooks/useExplorer.js'
import { ExplorerHeader } from './ExplorerHeader.jsx'
import { ExplorerProgress } from './ExplorerProgress.jsx'
import { FileRow } from './FileRow.jsx'
import { flattenVisibleTree } from './FileTree.jsx'
import { FolderRow } from './FolderRow.jsx'

export function ExplorerPanel({ bridge }) {
  const loadingWidths = ['92%', '74%', '86%', '68%', '81%', '63%']
  const { state, actions } = useExplorer({ bridge })
  const panelRef = useRef(null)
  const [scrollElement, setScrollElement] = useState(null)
  const activeNormalized = normalizeFileUrlForCompare(state.activeFileUrl || '')
  const treeRows = useMemo(
    () => flattenVisibleTree(state.tree?.children || [], state.expandedMap),
    [state.tree, state.expandedMap]
  )
  const activeFileIndex = useMemo(
    () =>
      state.files.findIndex(
        (file) => normalizeFileUrlForCompare(file?.href || '') === activeNormalized
      ),
    [activeNormalized, state.files]
  )
  const activeTreeIndex = useMemo(
    () =>
      treeRows.findIndex(
        (row) =>
          row.type === 'file' && normalizeFileUrlForCompare(row.node?.href || '') === activeNormalized
      ),
    [activeNormalized, treeRows]
  )

  useEffect(() => {
    setScrollElement(panelRef.current?.closest('.mdp-explorer-container') || null)
  }, [])

  const fileVirtualizer = useVirtualizer({
    count: state.files.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 34,
    overscan: 10
  })
  const treeVirtualizer = useVirtualizer({
    count: treeRows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 34,
    overscan: 12
  })

  useEffect(() => {
    if (state.view !== 'files') return
    if (activeFileIndex < 0) return
    fileVirtualizer.scrollToIndex(activeFileIndex, { align: 'nearest' })
  }, [activeFileIndex, fileVirtualizer, state.view])

  useEffect(() => {
    if (state.view !== 'tree') return
    if (activeTreeIndex < 0) return
    treeVirtualizer.scrollToIndex(activeTreeIndex, { align: 'nearest' })
  }, [activeTreeIndex, state.view, treeVirtualizer])

  const fileVirtualItems = fileVirtualizer.getVirtualItems()
  const treeVirtualItems = treeVirtualizer.getVirtualItems()

  return (
    <div className="mdp-explorer" role="region" aria-label="Markdown files in folder" ref={panelRef}>
      <ExplorerHeader
        filesContext={state.filesContext}
        summaryDirectoryLabel={state.summaryDirectoryLabel}
        summaryFileCount={state.summaryFileCount}
        depthNotice={state.depthNotice}
        actionsMode={state.actionsMode}
        showBack={state.showBack}
        backLabel={state.backLabel}
        onBack={actions.onBack}
        onOpenAnotherFolder={actions.onOpenAnotherFolder}
        onExitWorkspace={actions.onExitWorkspace}
      />

      <div className="mdp-explorer__loading" hidden={state.view !== 'loading'}>
        <SkeletonBlock lines={loadingWidths.length} widths={loadingWidths} lineHeight={14} gap={10} />
      </div>

      <div className="mdp-explorer__empty" hidden={state.view !== 'empty'}>
        No markdown files found in this directory.
      </div>

      <div hidden={state.view !== 'progress'}>
        <ExplorerProgress
          headline={state.progressHeadline}
          text={state.progressText}
          showCancel={state.showProgressCancel}
          onCancel={actions.onCancelProgress}
        />
      </div>

      <ul
        className="mdp-explorer__list mdp-explorer__list--virtual"
        role="tree"
        aria-label="Files in current folder"
        hidden={state.view !== 'files'}
        style={{ height: `${fileVirtualizer.getTotalSize()}px` }}
      >
        {fileVirtualItems.map((virtualItem) => {
          const file = state.files[virtualItem.index]
          if (!file) return null
          return (
            <FileRow
              key={virtualItem.key}
              file={{ displayName: file.displayName, href: file.href }}
              depth={1}
              autoScrollActive={false}
              rowStyle={{ transform: `translateY(${virtualItem.start}px)` }}
              isActive={normalizeFileUrlForCompare(file.href || '') === activeNormalized}
              onPick={actions.onNavigate}
            />
          )
        })}
      </ul>

      <ul
        className="mdp-explorer__list mdp-explorer__list--virtual"
        role="tree"
        aria-label={state.listAriaLabel || 'Workspace files'}
        hidden={state.view !== 'tree'}
        style={{ height: `${treeVirtualizer.getTotalSize()}px` }}
      >
        {treeVirtualItems.map((virtualItem) => {
          const row = treeRows[virtualItem.index]
          if (!row?.node) return null
          if (row.type === 'folder') {
            return (
              <FolderRow
                key={virtualItem.key}
                node={row.node}
                depth={row.depth}
                expanded={row.expanded}
                rowStyle={{ transform: `translateY(${virtualItem.start}px)` }}
                onToggleFolder={actions.onToggleFolder}
              />
            )
          }
          return (
            <FileRow
              key={virtualItem.key}
              file={{ displayName: row.node.name, href: row.node.href }}
              depth={row.depth}
              autoScrollActive={false}
              rowStyle={{ transform: `translateY(${virtualItem.start}px)` }}
              isActive={normalizeFileUrlForCompare(row.node.href || '') === activeNormalized}
              onPick={actions.onNavigate}
            />
          )
        })}
      </ul>
    </div>
  )
}
