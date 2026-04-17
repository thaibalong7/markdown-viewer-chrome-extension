import React, { useMemo } from 'react'
import { getToolbarHeightInScrollRoot, scrollToElementInViewer } from '../../scroll-utils.js'
import { useViewerState } from '../contexts/ViewerStateContext.jsx'
import { useScrollSpy } from '../hooks/useScrollSpy.js'

function updateHash(id) {
  if (!id) return
  const encoded = `#${encodeURIComponent(id)}`
  if (window.location.hash === encoded) return
  window.history.replaceState(null, '', encoded)
}

export function OutlinePanel({ tocItems, scrollRoot }) {
  const { activeSidebarTab } = useViewerState()
  const isFiles = activeSidebarTab === 'files'

  const headings = useMemo(
    () =>
      (tocItems || [])
        .filter((item) => item?.id && item?.el)
        .map((item) => ({ id: item.id, el: item.el })),
    [tocItems]
  )

  const activeHeadingId = useScrollSpy({
    scrollRoot,
    headings,
    getToolbarHeight: () => getToolbarHeightInScrollRoot(scrollRoot)
  })

  const fallbackActiveId = headings[0]?.id || null
  const resolvedActiveId = activeHeadingId || fallbackActiveId

  return (
    <div
      className="mdp-sidebar-panel mdp-sidebar-panel--outline"
      role="tabpanel"
      id="mdp-panel-outline"
      aria-labelledby="mdp-tab-outline"
      hidden={isFiles}
    >
      <div className="mdp-sidebar__title">Outline</div>
      <nav className="mdp-toc" aria-label="Table of contents">
        {headings.length ? (
          <ul className="mdp-toc__list">
            {tocItems.map((item) => {
              const isActive = item.id === resolvedActiveId
              return (
                <li className="mdp-toc__item" key={item.id}>
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
