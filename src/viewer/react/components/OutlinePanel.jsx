import React, { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getToolbarHeightInScrollRoot, scrollToElementInViewer } from '../../scroll-utils.js'
import { SkeletonBlock } from '../../../shared/react/Skeleton.jsx'
import { useSidebarTabState } from '../contexts/SidebarTabContext.jsx'
import { useScrollSpy } from '../hooks/useScrollSpy.js'

function updateHash(id) {
  if (!id) return
  const encoded = `#${encodeURIComponent(id)}`
  if (window.location.hash === encoded) return
  window.history.replaceState(null, '', encoded)
}

const OUTLINE_SKELETON_WIDTHS = ['86%', '72%', '78%', '60%', '82%', '68%', '94%', '76%', '62%', '48%']

export function OutlinePanel({ tocItems, tocReady, scrollRoot }) {
  const { activeSidebarTab } = useSidebarTabState()
  const isFiles = activeSidebarTab === 'files'
  const tocScrollRef = useRef(null)
  const outlineItems = useMemo(
    () => (tocItems || []).filter((item) => item?.id && item?.el),
    [tocItems]
  )

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
    estimateSize: () => 32,
    overscan: 8
  })

  useEffect(() => {
    if (activeIndex < 0) return
    outlineVirtualizer.scrollToIndex(activeIndex, { align: 'nearest' })
  }, [activeIndex, outlineVirtualizer])

  const virtualRows = outlineVirtualizer.getVirtualItems()

  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--outline"
      role="tabpanel"
      id="mdp-panel-outline"
      aria-labelledby="mdp-tab-outline"
      hidden={isFiles}
    >
      <div className="mdp-sidebar__title">Outline</div>
      <nav
        className="mdp-toc"
        aria-label="Table of contents"
        aria-busy={!tocReady}
        ref={tocScrollRef}
      >
        {!tocReady ? (
          <SkeletonBlock
            className="mdp-toc__skeleton"
            lines={OUTLINE_SKELETON_WIDTHS.length}
            widths={OUTLINE_SKELETON_WIDTHS}
            lineHeight={12}
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
                    onClick={(event) => {
                      event.preventDefault()
                      const toolbarHeight = getToolbarHeightInScrollRoot(scrollRoot)
                      updateHash(item.id)
                      scrollToElementInViewer({
                        element: item.el,
                        scrollRoot,
                        toolbarHeight,
                        behavior: 'smooth'
                      })
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
    </div>
  )
}
