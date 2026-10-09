import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getToolbarHeightInScrollRoot } from '../../scroll-utils.js'
import { SkeletonBlock } from '../../../shared/react/Skeleton.jsx'
import { ViewerScrollbar } from './ViewerScrollbar.jsx'
import { useScrollSpy } from '../hooks/useScrollSpy.js'
import { useDelayedBusyState } from '../hooks/useDelayedBusyState.js'
import { useEditorState } from '../contexts/EditorContext.jsx'
import {
  OUTLINE_AUTO_FOLLOW_PAUSE_MS,
  OUTLINE_CONTENT_SCROLL_SUPPRESS_MS,
  getOutlineRevealAction
} from './outline-follow.js'

const OUTLINE_SKELETON_WIDTHS = ['86%', '72%', '78%', '60%', '82%', '68%', '94%', '76%', '62%', '48%']

export function OutlinePanel({
  expanded = true,
  scrollbarVisibility,
  tocItems,
  tocReady,
  scrollRoot,
  onTocClickInEditor,
  onHeadingNavigate
}) {
  const editorState = useEditorState()
  const editorEditActive = Boolean(editorState?.enabled)
  const tocScrollRef = useRef(null)
  const [scrollElement, setScrollElement] = useState(null)
  const [rowHeight, setRowHeight] = useState(36)
  const handleScrollRef = useCallback(node => {
    tocScrollRef.current = node
    setScrollElement(node)
  }, [])
  useLayoutEffect(() => {
    const media = scrollElement?.ownerDocument.defaultView.matchMedia?.('(pointer: coarse)')
    const measure = () => setRowHeight(media?.matches ? 44 : 36)
    measure()
    media?.addEventListener('change', measure)
    return () => media?.removeEventListener('change', measure)
  }, [scrollElement])
  const userTocInteractionPausedUntilRef = useRef(0)
  const contentSmoothScrollSuppressedUntilRef = useRef(0)
  const pendingClickTargetIdRef = useRef(null)
  const outlineItems = useMemo(
    () => (tocItems || []).filter((item) => item?.id && item?.el),
    [tocItems]
  )
  const loadingVisible = useDelayedBusyState(!tocReady)
  const hasPreviousOutline = outlineItems.length > 0
  const showLoadingPlaceholder = loadingVisible || (!tocReady && !hasPreviousOutline)
  const loadingPlaceholderPending = showLoadingPlaceholder && !loadingVisible

  const headings = useMemo(
    () => outlineItems.map((item) => ({ id: item.id, el: item.el })),
    [outlineItems]
  )

  const activeHeadingId = useScrollSpy({
    scrollRoot,
    headings,
    getToolbarHeight: () => getToolbarHeightInScrollRoot(scrollRoot)
  })

  const fallbackActiveId = headings[0]?.id || null
  const resolvedActiveId = activeHeadingId || fallbackActiveId
  const activeIndex = useMemo(
    () => outlineItems.findIndex((item) => item.id === resolvedActiveId),
    [outlineItems, resolvedActiveId]
  )

  const outlineVirtualizer = useVirtualizer({
    count: outlineItems.length,
    getScrollElement: () => tocScrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8
  })

  useEffect(() => { outlineVirtualizer.measure() }, [outlineVirtualizer, rowHeight])

  useEffect(() => {
    if (activeIndex < 0) return
    const now = Date.now()
    const pendingClickTargetId = pendingClickTargetIdRef.current

    if (now < userTocInteractionPausedUntilRef.current) return
    if (
      now < contentSmoothScrollSuppressedUntilRef.current &&
      resolvedActiveId !== pendingClickTargetId
    ) {
      return
    }

    if (resolvedActiveId === pendingClickTargetId) {
      pendingClickTargetIdRef.current = null
      contentSmoothScrollSuppressedUntilRef.current = 0
    }

    const scrollEl = tocScrollRef.current
    if (!scrollEl) return

    const activeRow = outlineVirtualizer.getVirtualItems()
      .find((row) => row.index === activeIndex)
    const action = getOutlineRevealAction({
      activeIndex,
      activeRow,
      scrollTop: scrollEl.scrollTop,
      viewportHeight: scrollEl.clientHeight
    })

    if (action === 'center') {
      outlineVirtualizer.scrollToIndex(activeIndex, { align: 'center' })
    }
  }, [activeIndex, outlineVirtualizer, resolvedActiveId])

  const virtualRows = outlineVirtualizer.getVirtualItems()
  const pauseAutoFollowForTocInteraction = () => {
    userTocInteractionPausedUntilRef.current = Date.now() + OUTLINE_AUTO_FOLLOW_PAUSE_MS
  }

  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--outline"
      id="mdp-panel-outline"
    >
      <div className="mdp-outline__header">
        <span>On this page</span>
        <span className="mdp-outline__count">{loadingVisible
          ? 'Loading…'
          : outlineItems.length || tocReady
            ? `${outlineItems.length} ${outlineItems.length === 1 ? 'heading' : 'headings'}`
            : ''}</span>
      </div>
      <nav
        className="mdp-toc"
        aria-label="Table of contents"
        aria-busy={!tocReady || loadingVisible}
        ref={handleScrollRef}
        onWheel={pauseAutoFollowForTocInteraction}
        onPointerDown={pauseAutoFollowForTocInteraction}
        onKeyDown={pauseAutoFollowForTocInteraction}
      >
        {showLoadingPlaceholder ? (
          <SkeletonBlock
            className={`mdp-toc__skeleton${loadingPlaceholderPending ? ' is-pending' : ''}`}
            lines={OUTLINE_SKELETON_WIDTHS.length}
            widths={OUTLINE_SKELETON_WIDTHS}
            lineHeight={14}
            gap={10}
          />
        ) : headings.length ? (
          <ul className="mdp-toc__list mdp-toc__list--virtual" style={{ height: `${outlineVirtualizer.getTotalSize()}px` }}>
            {virtualRows.map((virtualRow) => {
              const item = outlineItems[virtualRow.index]
              if (!item) return null
              const isActive = item.id === resolvedActiveId
              return (
                <li
                  className="mdp-toc__item mdp-toc__item--virtual"
                  key={virtualRow.key}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <a
                    href={`#${item.id}`}
                    className={`mdp-toc__link mdp-toc__link--h${item.level}${
                      isActive ? ' is-active' : ''
                    }`}
                    data-mdp-toc-id={item.id}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      pendingClickTargetIdRef.current = item.id
                      contentSmoothScrollSuppressedUntilRef.current =
                        Date.now() + OUTLINE_CONTENT_SCROLL_SUPPRESS_MS
                      onHeadingNavigate?.(item.id)
                      outlineVirtualizer.scrollToIndex(virtualRow.index, { align: 'center' })
                      if (editorEditActive && typeof onTocClickInEditor === 'function') {
                        onTocClickInEditor(item.text)
                      }
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mdp-toc__empty">No headings found.</div>
        )}
      </nav>
      <ViewerScrollbar scrollElement={expanded ? scrollElement : null}
        visibility={scrollbarVisibility} label="Outline scrollbar" variant="sidebar"
        contentSelector=".mdp-toc__list, .mdp-toc__skeleton, .mdp-toc__empty"
        contentVersion={`${tocReady}:${showLoadingPlaceholder}:${outlineItems.length}`} />
    </div>
  )
}
