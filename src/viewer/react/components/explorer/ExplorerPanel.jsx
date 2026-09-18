import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { isWorkspaceVirtualHref, normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'
import { getWorkspaceRootUrl } from '../../../explorer/explorer-state.js'
import { buildCollapsedExpandedMap } from '../../../explorer/explorer-tree-utils.js'
import { SkeletonBlock } from '../../../../shared/react/Skeleton.jsx'
import { useExplorer } from '../../hooks/useExplorer.js'
import { useDelayedBusyState } from '../../hooks/useDelayedBusyState.js'
import { ExplorerHeader } from './ExplorerHeader.jsx'
import { ExplorerProgress } from './ExplorerProgress.jsx'
import {
  getActiveExplorerRowRevealState,
  revealActiveExplorerRow
} from './explorer-reveal.js'
import { FileRow } from './FileRow.jsx'
import { flattenVisibleTree } from './FileTree.jsx'
import { FolderRow } from './FolderRow.jsx'

export function ExplorerPanel({ bridge }) {
  const loadingWidths = ['92%', '74%', '86%', '68%', '81%', '63%']
  const { state, actions } = useExplorer({ bridge })
  const actualBusy = state.view === 'loading' || state.view === 'progress'
  const loadingVisible = useDelayedBusyState(actualBusy)
  const lastSettledStateRef = useRef(null)
  const busyStateRef = useRef(state)

  if (actualBusy) {
    busyStateRef.current = state
  } else {
    lastSettledStateRef.current = state
  }

  const viewState = actualBusy
    ? loadingVisible || !lastSettledStateRef.current
      ? state
      : lastSettledStateRef.current
    : loadingVisible
      ? busyStateRef.current
      : state
  const presentedView =
    viewState.view === 'progress' && !viewState.showProgressCancel ? 'loading' : viewState.view
  const panelRef = useRef(null)
  const pendingRefreshTreeScrollRef = useRef(null)
  const restoreScrollRafRef = useRef(0)
  const suppressNextAutoRevealRef = useRef('')
  const revealTimersRef = useRef({ afterScrollRaf: 0, raf: 0, timeouts: [] })
  const [scrollElement, setScrollElement] = useState(null)
  const activeNormalized = normalizeFileUrlForCompare(viewState.activeFileUrl || '')
  const refreshDisabled =
    !viewState.currentFileUrl ||
    isWorkspaceVirtualHref(viewState.currentFileUrl) ||
    (viewState.explorerMode === 'workspace' && !getWorkspaceRootUrl()) ||
    actualBusy ||
    loadingVisible
  const isBusy = actualBusy || loadingVisible
  const showCollapseAllFolders = presentedView === 'tree'
  const collapseAllExpandedMap = useMemo(
    () =>
      buildCollapsedExpandedMap(
        viewState.tree?.children || [],
        viewState.activeFileUrl,
        viewState.expandedMap,
        normalizeFileUrlForCompare
      ),
    [viewState.activeFileUrl, viewState.expandedMap, viewState.tree]
  )
  const canCollapseAllFolders = Array.from(viewState.expandedMap.values()).some(Boolean)
  const collapseKeepsOpenFilePath = Array.from(collapseAllExpandedMap.values()).some(Boolean)
  const refreshTooltip = (() => {
    if (isBusy) return 'Refresh is available after scanning finishes'
    if (!viewState.currentFileUrl) return 'Open a supported file before refreshing'
    if (isWorkspaceVirtualHref(viewState.currentFileUrl)) return 'Refresh is unavailable for virtual workspace files'
    if (viewState.explorerMode === 'workspace' && !getWorkspaceRootUrl()) return 'Refresh is unavailable for virtual workspaces'
    return state.isRefreshing ? 'Refreshing file and list' : 'Refresh open file and file list'
  })()
  const treeRows = useMemo(
    () => flattenVisibleTree(viewState.tree?.children || [], viewState.expandedMap),
    [viewState.tree, viewState.expandedMap]
  )
  const activeFileIndex = useMemo(
    () =>
      viewState.files.findIndex(
        (file) => normalizeFileUrlForCompare(file?.href || '') === activeNormalized
      ),
    [activeNormalized, viewState.files]
  )
  const activeTreeIndex = useMemo(
    () =>
      treeRows.findIndex(
        (row) =>
          row.type === 'file' && normalizeFileUrlForCompare(row.node?.href || '') === activeNormalized
      ),
    [activeNormalized, treeRows]
  )
  const headerLayoutKey = [
    viewState.actionsMode,
    viewState.backLabel,
    viewState.depthNotice,
    viewState.filesContext?.currentLine,
    viewState.filesContext?.statusLine,
    viewState.filesContext?.warningLine,
    viewState.showBack ? 'back' : 'no-back',
    viewState.summaryDirectoryLabel,
    viewState.summaryFileCount
  ].join('|')

  useEffect(() => {
    setScrollElement(panelRef.current?.closest('.mdp-explorer-container') || null)
  }, [])

  const clearRevealTimers = useCallback(() => {
    const timers = revealTimersRef.current
    if (timers.raf) cancelAnimationFrame(timers.raf)
    if (timers.afterScrollRaf) cancelAnimationFrame(timers.afterScrollRaf)
    for (const timeoutId of timers.timeouts) {
      clearTimeout(timeoutId)
    }
    timers.afterScrollRaf = 0
    timers.raf = 0
    timers.timeouts = []
  }, [])

  useEffect(() => () => {
    if (restoreScrollRafRef.current) cancelAnimationFrame(restoreScrollRafRef.current)
    clearRevealTimers()
  }, [clearRevealTimers])

  useEffect(() => {
    if (!state.isRefreshing && state.view !== 'tree') {
      pendingRefreshTreeScrollRef.current = null
    }
  }, [state.isRefreshing, state.view])

  const fileVirtualizer = useVirtualizer({
    count: viewState.files.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 36,
    overscan: 10
  })
  const treeVirtualizer = useVirtualizer({
    count: treeRows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 36,
    overscan: 12
  })

  const revealActiveRow = useCallback((virtualizer, activeIndex) => {
    const timers = revealTimersRef.current
    clearRevealTimers()

    const reveal = () => {
      const revealState = getActiveExplorerRowRevealState({
        panelEl: panelRef.current,
        scrollEl: scrollElement
      })
      if (revealState === 'visible') return

      if (revealState === 'missing') {
        virtualizer.scrollToIndex(activeIndex, { align: 'start' })
        timers.afterScrollRaf = requestAnimationFrame(() => {
          timers.afterScrollRaf = 0
          revealActiveExplorerRow({ panelEl: panelRef.current, scrollEl: scrollElement })
        })
        return
      }

      revealActiveExplorerRow({ panelEl: panelRef.current, scrollEl: scrollElement })
    }
    timers.raf = requestAnimationFrame(() => {
      timers.raf = 0
      reveal()
      timers.timeouts = [50, 150].map((delay) => setTimeout(reveal, delay))
    })
  }, [clearRevealTimers, scrollElement])

  useEffect(() => {
    if (presentedView !== 'files') return
    if (activeFileIndex < 0) return
    if (suppressNextAutoRevealRef.current === activeNormalized) {
      suppressNextAutoRevealRef.current = ''
      return
    }
    revealActiveRow(fileVirtualizer, activeFileIndex)
  }, [
    activeFileIndex,
    activeNormalized,
    fileVirtualizer,
    headerLayoutKey,
    revealActiveRow,
    presentedView
  ])

  useEffect(() => {
    if (presentedView !== 'tree') return
    if (activeTreeIndex < 0) return
    if (suppressNextAutoRevealRef.current === activeNormalized) {
      suppressNextAutoRevealRef.current = ''
      return
    }
    revealActiveRow(treeVirtualizer, activeTreeIndex)
  }, [
    activeNormalized,
    activeTreeIndex,
    headerLayoutKey,
    revealActiveRow,
    presentedView,
    treeVirtualizer
  ])

  useLayoutEffect(() => {
    const pending = pendingRefreshTreeScrollRef.current
    if (state.view !== 'tree' || state.isRefreshing || !pending || !scrollElement) return

    const restore = () => {
      const maxScrollTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight)
      scrollElement.scrollTop = Math.min(pending.top, maxScrollTop)
    }

    restore()
    if (restoreScrollRafRef.current) cancelAnimationFrame(restoreScrollRafRef.current)
    restoreScrollRafRef.current = requestAnimationFrame(() => {
      restoreScrollRafRef.current = 0
      restore()
      pendingRefreshTreeScrollRef.current = null
    })
  }, [scrollElement, state.isRefreshing, state.tree, state.view, treeRows.length])

  const onPickFileFromExplorer = (href) => {
    const pickedNormalized = normalizeFileUrlForCompare(href || '')
    suppressNextAutoRevealRef.current =
      pickedNormalized && pickedNormalized !== activeNormalized ? pickedNormalized : ''
    actions.onNavigate(href)
  }

  const onToggleFolderFromExplorer = (href) => {
    suppressNextAutoRevealRef.current = activeNormalized
    actions.onToggleFolder(href)
  }

  const onRefreshFromExplorer = () => {
    if (state.view === 'tree' && scrollElement) {
      pendingRefreshTreeScrollRef.current = { top: scrollElement.scrollTop }
      suppressNextAutoRevealRef.current = activeNormalized
    }
    actions.onRefresh()
  }

  const onCollapseAllFoldersFromExplorer = () => {
    suppressNextAutoRevealRef.current = activeNormalized
    actions.onCollapseAllFolders()
  }

  const fileVirtualItems = fileVirtualizer.getVirtualItems()
  const treeVirtualItems = treeVirtualizer.getVirtualItems()

  return (
    <div
      className="mdp-explorer"
      role="region"
      aria-label="Supported files in folder"
      aria-busy={isBusy}
      ref={panelRef}
    >
      <ExplorerHeader
        filesContext={viewState.filesContext}
        summaryDirectoryLabel={viewState.summaryDirectoryLabel}
        summaryFileCount={viewState.summaryFileCount}
        depthNotice={viewState.depthNotice}
        actionsMode={viewState.actionsMode}
        showBack={viewState.showBack}
        backLabel={viewState.backLabel}
        isRefreshing={state.isRefreshing}
        refreshDisabled={refreshDisabled}
        refreshTooltip={refreshTooltip}
        showCollapseAllFolders={showCollapseAllFolders}
        collapseAllFoldersDisabled={!canCollapseAllFolders}
        collapseKeepsOpenFilePath={collapseKeepsOpenFilePath}
        actionsDisabled={isBusy}
        onBack={actions.onBack}
        onRefresh={onRefreshFromExplorer}
        onCollapseAllFolders={onCollapseAllFoldersFromExplorer}
        onOpenAnotherFolder={actions.onOpenAnotherFolder}
        onExitWorkspace={actions.onExitWorkspace}
      />

      <div
        className={`mdp-explorer__loading${!loadingVisible ? ' is-pending' : ''}`}
        hidden={presentedView !== 'loading'}
      >
        <SkeletonBlock lines={loadingWidths.length} widths={loadingWidths} lineHeight={14} gap={10} />
      </div>

      <div className="mdp-explorer__empty" hidden={presentedView !== 'empty'}>
        No supported files found in this directory.
      </div>

      <div
        className={`mdp-explorer__busy-view${!loadingVisible ? ' is-pending' : ''}`}
        hidden={presentedView !== 'progress'}
      >
        <ExplorerProgress
          headline={viewState.progressHeadline}
          text={viewState.progressText}
          showCancel={viewState.showProgressCancel}
          onCancel={actions.onCancelProgress}
        />
      </div>

      <ul
        className="mdp-explorer__list mdp-explorer__list--virtual"
        role="tree"
        aria-label="Files in current folder"
        hidden={presentedView !== 'files'}
        style={{ height: `${fileVirtualizer.getTotalSize()}px` }}
      >
        {fileVirtualItems.map((virtualItem) => {
          const file = viewState.files[virtualItem.index]
          if (!file) return null
          return (
            <FileRow
              key={virtualItem.key}
              file={{ displayName: file.displayName, href: file.href, fileTypeId: file.fileTypeId }}
              depth={1}
              rowStyle={{ transform: `translateY(${virtualItem.start}px)` }}
              isActive={normalizeFileUrlForCompare(file.href || '') === activeNormalized}
              onPick={onPickFileFromExplorer}
            />
          )
        })}
      </ul>

      <ul
        className="mdp-explorer__list mdp-explorer__list--virtual"
        role="tree"
        aria-label={viewState.listAriaLabel || 'Workspace files'}
        hidden={presentedView !== 'tree'}
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
                onToggleFolder={onToggleFolderFromExplorer}
              />
            )
          }
          return (
            <FileRow
              key={virtualItem.key}
              file={{
                displayName: row.node.name,
                href: row.node.href,
                fileTypeId: row.node.fileTypeId
              }}
              depth={row.depth}
              rowStyle={{ transform: `translateY(${virtualItem.start}px)` }}
              isActive={normalizeFileUrlForCompare(row.node.href || '') === activeNormalized}
              onPick={onPickFileFromExplorer}
            />
          )
        })}
      </ul>
    </div>
  )
}
