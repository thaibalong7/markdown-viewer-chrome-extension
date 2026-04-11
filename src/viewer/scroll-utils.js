import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../shared/constants/viewer.js'

/**
 * Scroll so `element` aligns under the sticky toolbar inside `scrollRoot`, or fall back to window scroll.
 *
 * @param {object} options
 * @param {Element} options.element
 * @param {Element | null} [options.scrollRoot] - `.mdp-root` when present
 * @param {number} [options.toolbarHeight] - measured toolbar height (px)
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
 * Toolbar height inside a viewer scroll root (sticky `.mdp-toolbar`).
 * @param {Element | null | undefined} scrollRoot
 * @returns {number}
 */
export function getToolbarHeightInScrollRoot(scrollRoot) {
  const toolbarEl = scrollRoot?.querySelector?.('.mdp-toolbar')
  return toolbarEl?.getBoundingClientRect?.().height || MDP_TOOLBAR_HEIGHT_FALLBACK_PX
}
