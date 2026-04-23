import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../shared/constants/viewer.js'

/**
 * Scroll so `element` aligns near the top of the viewer scroll root, or fall back to window scroll.
 *
 * @param {object} options
 * @param {Element} options.element
 * @param {Element | null} [options.scrollRoot] - `.mdp-root` when present
 * @param {number} [options.toolbarHeight] - top offset in px (0 when no top chrome)
 * @param {ScrollBehavior} [options.behavior]
 */
export function scrollToElementInViewer({
  element,
  scrollRoot = null,
  toolbarHeight = MDP_TOOLBAR_HEIGHT_FALLBACK_PX,
  behavior = 'auto'
} = {}) {
  if (!element) return

  const offset = toolbarHeight + SCROLL_PADDING_PX

  if (scrollRoot && typeof scrollRoot.scrollTo === 'function') {
    const rootRect = scrollRoot.getBoundingClientRect()
    const elRect = element.getBoundingClientRect()
    const targetTop = elRect.top - rootRect.top + scrollRoot.scrollTop - offset
    scrollRoot.scrollTo({ top: targetTop, behavior })
    return
  }

  const top = element.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior })
}

/**
 * Top chrome offset inside a viewer scroll root.
 * @param {Element | null | undefined} scrollRoot
 * @returns {number}
 */
export function getToolbarHeightInScrollRoot(scrollRoot) {
  void scrollRoot
  return MDP_TOOLBAR_HEIGHT_FALLBACK_PX
}
