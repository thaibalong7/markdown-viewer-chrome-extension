/** Default time before the toast fades (matches prior `MarkdownViewerApp` behavior). */
export const VIEWER_TOAST_DURATION_MS = 2200

const TOAST_CLASS = 'mdp-toast'
const TOAST_VISIBLE_CLASS = 'is-visible'

/** @type {WeakMap<Element, ReturnType<typeof setTimeout>>} */
const hideTimersByRoot = new WeakMap()

/**
 * @param {Element | null | undefined} node
 * @returns {HTMLElement | null}
 */
function asHTMLElement(node) {
  return node instanceof HTMLElement ? node : null
}

/**
 * Viewer shell root (`.mdp-root`) from a node inside the viewer or the root element itself.
 * @param {Element | null | undefined} from
 * @returns {HTMLElement | null}
 */
export function getViewerToastRoot(from) {
  const el = asHTMLElement(from)
  if (!el) return null
  return el.classList.contains('mdp-root') ? el : el.closest('.mdp-root')
}

/**
 * Ensure a single status toast element exists under the viewer root.
 * @param {HTMLElement} viewerRoot
 */
function getOrCreateToastEl(viewerRoot) {
  const existing = viewerRoot.querySelector(`:scope > .${TOAST_CLASS}`)
  if (existing instanceof HTMLElement) return existing

  const toast = document.createElement('div')
  toast.className = TOAST_CLASS
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  viewerRoot.appendChild(toast)
  return toast
}

function clearScheduledHide(viewerRoot) {
  const id = hideTimersByRoot.get(viewerRoot)
  if (id != null) {
    clearTimeout(id)
    hideTimersByRoot.delete(viewerRoot)
  }
}

/**
 * Brief bottom-centered toast (styles: `base.scss` `.mdp-toast`).
 * Re-showing replaces the message and resets the hide timer for that viewer root.
 *
 * @param {Element | null | undefined} anchor — `.mdp-root` or any descendant under it
 * @param {string} message
 * @param {{ durationMs?: number }} [options]
 */
export function showViewerToast(anchor, message, options = {}) {
  const viewerRoot = getViewerToastRoot(anchor)
  if (!viewerRoot || typeof message !== 'string') return

  const durationMs =
    typeof options.durationMs === 'number' && options.durationMs > 0
      ? options.durationMs
      : VIEWER_TOAST_DURATION_MS

  const toast = getOrCreateToastEl(viewerRoot)
  toast.textContent = message
  toast.classList.add(TOAST_VISIBLE_CLASS)

  clearScheduledHide(viewerRoot)
  hideTimersByRoot.set(
    viewerRoot,
    setTimeout(() => {
      toast.classList.remove(TOAST_VISIBLE_CLASS)
      hideTimersByRoot.delete(viewerRoot)
    }, durationMs)
  )
}

/**
 * Cancel pending hide and hide immediately (e.g. viewer teardown).
 * @param {Element | null | undefined} anchor
 */
export function dismissViewerToast(anchor) {
  const viewerRoot = getViewerToastRoot(anchor)
  if (!viewerRoot) return
  clearScheduledHide(viewerRoot)
  viewerRoot.querySelector(`:scope > .${TOAST_CLASS}`)?.classList.remove(TOAST_VISIBLE_CLASS)
}
