import { buildTocItems, renderToc } from '../core/toc-builder.js'
import { createScrollSpy } from '../core/scroll-spy.js'
import { getToolbarHeightInScrollRoot, scrollToElementInViewer } from '../scroll-utils.js'

function getScrollRoot(articleEl) {
  return articleEl?.closest?.('.mdp-root') || null
}

function updateHash(id) {
  if (!id) return
  const encoded = `#${encodeURIComponent(id)}`
  if (window.location.hash === encoded) return
  window.history.replaceState(null, '', encoded)
}

export function rebuildToc({ articleEl, tocContainerEl } = {}) {
  if (!articleEl || !tocContainerEl) {
    return {
      destroy() {}
    }
  }

  const tocItems = buildTocItems(articleEl)
  const { linkById } = renderToc(tocContainerEl, tocItems)

  const headingsById = new Map(tocItems.map((item) => [item.id, item.el]))
  const headingEls = tocItems.map((item) => ({ id: item.id, el: item.el }))
  const scrollRoot = getScrollRoot(articleEl)
  const toolbarHeightGetter = () => getToolbarHeightInScrollRoot(scrollRoot || articleEl)

  let currentActiveId = null
  const setActive = (id) => {
    if (currentActiveId && linkById.has(currentActiveId)) {
      linkById.get(currentActiveId).classList.remove('is-active')
    }
    currentActiveId = id
    if (id && linkById.has(id)) {
      linkById.get(id).classList.add('is-active')
    }
  }

  // Click-to-scroll wiring.
  const clickHandlers = []
  for (const { id } of headingEls) {
    const link = linkById.get(id)
    const headingEl = headingsById.get(id)
    if (!link || !headingEl) continue

    const handler = (e) => {
      e.preventDefault()
      const toolbarHeight = toolbarHeightGetter()
      setActive(id)
      updateHash(id)
      scrollToElementInViewer({
        element: headingEl,
        scrollRoot,
        toolbarHeight,
        behavior: 'smooth'
      })
    }

    link.addEventListener('click', handler)
    clickHandlers.push({ link, handler })
  }

  const scrollSpy =
    scrollRoot &&
    createScrollSpy({
      scrollRoot,
      headings: headingEls,
      getToolbarHeight: toolbarHeightGetter,
      onActiveIdChange: (id) => setActive(id)
    })

  // Ensure initial active state reflects the current scroll position.
  // `createScrollSpy` already schedules an update; this just keeps UI consistent.
  if (headingEls.length) setActive(headingEls[0].id)

  return {
    destroy() {
      for (const { link, handler } of clickHandlers) {
        link.removeEventListener('click', handler)
      }
      scrollSpy?.destroy?.()
    }
  }
}

