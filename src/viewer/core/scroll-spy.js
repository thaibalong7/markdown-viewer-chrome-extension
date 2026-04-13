import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../../shared/constants/viewer.js'

const RESIZE_DEBOUNCE_MS = 100

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
  let resizeTimer = 0
  let measurements = []

  function computeHeadingTop(headingEl) {
    const rootRect = scrollRoot.getBoundingClientRect()
    const headingRect = headingEl.getBoundingClientRect()
    return headingRect.top - rootRect.top + scrollRoot.scrollTop
  }

  function refreshMeasurements() {
    measurements = headings
      .map((heading) => ({
        id: heading.id,
        top: computeHeadingTop(heading.el)
      }))
      .sort((a, b) => a.top - b.top)
  }

  function computeActiveIdFromMeasurements() {
    if (!measurements.length) return null

    const toolbarHeight = Number(getToolbarHeight()) || MDP_TOOLBAR_HEIGHT_FALLBACK_PX
    const threshold = scrollRoot.scrollTop + toolbarHeight + SCROLL_PADDING_PX

    let left = 0
    let right = measurements.length - 1
    let bestIndex = -1

    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2)
      if (measurements[mid].top <= threshold) {
        bestIndex = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return bestIndex >= 0 ? measurements[bestIndex].id : measurements[0].id
  }

  function update() {
    rafId = 0
    const nextId = computeActiveIdFromMeasurements()
    if (nextId && nextId !== currentActiveId) {
      currentActiveId = nextId
      if (typeof onActiveIdChange === 'function') onActiveIdChange(nextId)
    }
  }

  function scheduleUpdate() {
    if (rafId) return
    rafId = requestAnimationFrame(update)
  }

  function handleResize() {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resizeTimer = 0
      refreshMeasurements()
      scheduleUpdate()
    }, RESIZE_DEBOUNCE_MS)
  }

  refreshMeasurements()
  scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })

  // Initial calculation.
  scheduleUpdate()

  return {
    destroy() {
      scrollRoot.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', handleResize)
      if (rafId) cancelAnimationFrame(rafId)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }
}

