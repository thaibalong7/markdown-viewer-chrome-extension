import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../../shared/constants/viewer.js'

export function createScrollSpy({
  scrollRoot,
  headings,
  getToolbarHeight = () => MDP_TOOLBAR_HEIGHT_FALLBACK_PX,
  onActiveIdChange
}) {
  if (!scrollRoot || !headings?.length) {
    return {
      destroy() {}
    }
  }

  let currentActiveId = null
  let rafId = 0

  function computeActiveId() {
    const toolbarHeight = Number(getToolbarHeight()) || MDP_TOOLBAR_HEIGHT_FALLBACK_PX
    const rootRect = scrollRoot.getBoundingClientRect()
    const threshold = scrollRoot.scrollTop + toolbarHeight + SCROLL_PADDING_PX

    let active = null
    let bestTop = -Infinity

    for (const heading of headings) {
      const rectTop = heading.el.getBoundingClientRect().top - rootRect.top + scrollRoot.scrollTop
      if (rectTop <= threshold && rectTop > bestTop) {
        bestTop = rectTop
        active = heading.id
      }
    }

    return active ?? headings[0].id
  }

  function update() {
    rafId = 0
    const nextId = computeActiveId()
    if (nextId && nextId !== currentActiveId) {
      currentActiveId = nextId
      if (typeof onActiveIdChange === 'function') onActiveIdChange(nextId)
    }
  }

  function scheduleUpdate() {
    if (rafId) return
    rafId = requestAnimationFrame(update)
  }

  scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })

  // Initial calculation.
  scheduleUpdate()

  return {
    destroy() {
      scrollRoot.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }
}

