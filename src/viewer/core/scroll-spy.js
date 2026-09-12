import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../../shared/constants/viewer.js'

const RESIZE_DEBOUNCE_MS = 100
const LAYOUT_REFRESH_DEBOUNCE_MS = 120
const ACTIVE_HEADING_VIEWPORT_RATIO = 0.22
const ACTIVE_HEADING_MAX_OFFSET_PX = 144
const SCROLL_END_TOLERANCE_PX = 2

/**
 * Pick the section that best represents the reader's current position.
 *
 * The activation line settles into the upper part of the viewport as the reader
 * scrolls. Ramping that offset in from the top keeps short introductions from
 * making the second heading active while the page is still at scroll position 0.
 * At the bottom of a scrollable document, prefer the final heading because it may
 * never be able to cross the activation line on its own.
 */
export function getActiveHeadingId({
  measurements,
  scrollTop,
  viewportHeight,
  scrollHeight,
  toolbarHeight = MDP_TOOLBAR_HEIGHT_FALLBACK_PX
} = {}) {
  if (!measurements?.length) return null

  const top = Math.max(0, Number(scrollTop) || 0)
  const height = Math.max(0, Number(viewportHeight) || 0)
  const contentHeight = Math.max(0, Number(scrollHeight) || 0)
  const toolbar = Math.max(0, Number(toolbarHeight) || 0)
  const maxScrollTop = Math.max(0, contentHeight - height)
  const isScrollable = maxScrollTop > SCROLL_END_TOLERANCE_PX
  const isAtDocumentEnd = isScrollable && top >= maxScrollTop - SCROLL_END_TOLERANCE_PX

  if (isAtDocumentEnd) return measurements[measurements.length - 1].id

  const preferredOffset = Math.min(
    height * ACTIVE_HEADING_VIEWPORT_RATIO,
    ACTIVE_HEADING_MAX_OFFSET_PX
  )
  const activationOffset = Math.min(preferredOffset, top)
  const threshold = top + toolbar + SCROLL_PADDING_PX + activationOffset

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
  let layoutRefreshTimer = 0
  let resizeObserver = null
  let mutationObserver = null
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
    return getActiveHeadingId({
      measurements,
      scrollTop: scrollRoot.scrollTop,
      viewportHeight: scrollRoot.clientHeight,
      scrollHeight: scrollRoot.scrollHeight,
      toolbarHeight: getToolbarHeight()
    })
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
      refreshMeasurementsAndUpdate()
    }, RESIZE_DEBOUNCE_MS)
  }

  function refreshMeasurementsAndUpdate() {
    refreshMeasurements()
    scheduleUpdate()
  }

  function scheduleLayoutRefresh() {
    if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer)
    layoutRefreshTimer = setTimeout(() => {
      layoutRefreshTimer = 0
      refreshMeasurementsAndUpdate()
    }, LAYOUT_REFRESH_DEBOUNCE_MS)
  }

  const articleEl = headings[0]?.el?.closest?.('.mdp-markdown-body') || headings[0]?.el?.parentElement

  refreshMeasurements()
  scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })

  if (articleEl && typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(scheduleLayoutRefresh)
    resizeObserver.observe(articleEl)
  }

  if (articleEl && typeof MutationObserver === 'function') {
    mutationObserver = new MutationObserver(scheduleLayoutRefresh)
    mutationObserver.observe(articleEl, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    })
  }

  // Initial calculation.
  scheduleUpdate()

  return {
    destroy() {
      scrollRoot.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect?.()
      mutationObserver?.disconnect?.()
      if (rafId) cancelAnimationFrame(rafId)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer)
    }
  }
}
