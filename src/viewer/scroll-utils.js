import { MDP_TOOLBAR_HEIGHT_FALLBACK_PX, SCROLL_PADDING_PX } from '../shared/constants/viewer.js'

const HEADING_WITH_ID_SELECTOR = 'h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'
const ANCHOR_LOCK_DURATION_MS = 3000
const SMOOTH_SCROLL_SETTLE_MS = 450
const ANCHOR_POSITION_TOLERANCE_PX = 1
const USER_SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' '
])
const activeAnchorLocks = new WeakMap()

function decodeHashTarget(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function encodeHashTarget(value) {
  const raw = String(value || '').replace(/^#/, '')
  if (!raw) return ''

  try {
    const decoded = decodeURIComponent(raw)
    if (encodeURIComponent(decoded) === raw) {
      return raw
    }
  } catch {
    /* fall through to normal encoding */
  }

  return encodeURIComponent(raw)
}

function getHashTargetCandidates(hash) {
  const raw = String(hash || '').replace(/^#/, '')
  if (!raw) return []

  const decoded = decodeHashTarget(raw)
  return Array.from(new Set([
    raw,
    decoded,
    encodeHashTarget(raw),
    encodeHashTarget(decoded)
  ].filter(Boolean)))
}

function findElementById(root, id) {
  if (!root || !id) return null

  if (typeof root.querySelector === 'function' && globalThis.CSS?.escape) {
    try {
      const match = root.querySelector(`#${CSS.escape(id)}`)
      if (match) return match
    } catch {
      /* fall through to exact id scan */
    }
  }

  if (typeof root.querySelectorAll !== 'function') return null
  for (const element of root.querySelectorAll('[id]')) {
    if (element.id === id) return element
  }
  return null
}

/**
 * Encode a heading id/hash for location.hash without double-encoding legacy IDs that
 * may already contain percent-encoded Unicode segments.
 * @param {string} value
 * @returns {string}
 */
export function hashTargetToUrlFragment(value) {
  const encoded = encodeHashTarget(value)
  return encoded ? `#${encoded}` : ''
}

/**
 * Find a rendered heading by URL hash. Heading IDs may be decoded GitHub-style/custom IDs
 * or legacy percent-encoded markdown-it-anchor slugs, so try both forms.
 * @param {ParentNode | null | undefined} root
 * @param {string} hash
 * @returns {Element | null}
 */
export function findHeadingByHash(root, hash) {
  if (!root || !hash) return null
  for (const candidate of getHashTargetCandidates(hash)) {
    const element = findElementById(root, candidate)
    if (element?.matches?.(HEADING_WITH_ID_SELECTOR)) return element
  }
  return null
}

function getElementScrollTop(element, scrollRoot, toolbarHeight) {
  const offset = toolbarHeight + SCROLL_PADDING_PX
  const rootRect = scrollRoot.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.top - rootRect.top + scrollRoot.scrollTop - offset
}

/**
 * Cancel layout-shift correction for the current viewer scroller.
 * @param {Element | null | undefined} scrollRoot
 */
export function cancelViewerAnchorLock(scrollRoot) {
  if (!scrollRoot) return
  activeAnchorLocks.get(scrollRoot)?.()
}

/**
 * Scroll to an element and briefly keep it pinned below the toolbar while async content
 * (images, Mermaid SVGs, web fonts) can still change the layout above it. Any direct user
 * scroll gesture releases the lock immediately.
 *
 * @param {object} options
 * @param {Element} options.element
 * @param {Element} options.scrollRoot
 * @param {Element | null} [options.layoutRoot] - rendered article whose layout may change
 * @param {number} [options.toolbarHeight]
 * @param {ScrollBehavior} [options.behavior]
 * @param {number} [options.lockDuration]
 * @param {number} [options.smoothSettleDelay]
 * @returns {() => void} cancel function
 */
export function scrollToElementInViewerWithAnchorLock({
  element,
  scrollRoot = null,
  layoutRoot = null,
  toolbarHeight = MDP_TOOLBAR_HEIGHT_FALLBACK_PX,
  behavior = 'auto',
  lockDuration = ANCHOR_LOCK_DURATION_MS,
  smoothSettleDelay = SMOOTH_SCROLL_SETTLE_MS
} = {}) {
  if (!element || !scrollRoot || typeof scrollRoot.scrollTo !== 'function') return () => {}

  cancelViewerAnchorLock(scrollRoot)
  scrollRoot.scrollTo({
    top: getElementScrollTop(element, scrollRoot, toolbarHeight),
    behavior
  })

  let stopped = false
  let correctionTimer = null
  let correctionFrame = null
  let resizeObserver = null
  let mutationObserver = null
  const keyboardTarget = globalThis.window

  const clearCorrectionFrame = () => {
    if (correctionFrame == null) return
    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(correctionFrame)
    } else {
      globalThis.clearTimeout(correctionFrame)
    }
    correctionFrame = null
  }

  const cancel = () => {
    if (stopped) return
    stopped = true
    if (correctionTimer != null) globalThis.clearTimeout(correctionTimer)
    correctionTimer = null
    clearCorrectionFrame()
    globalThis.clearTimeout(expiryTimer)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    layoutRoot?.removeEventListener?.('load', scheduleCorrection, true)
    scrollRoot.removeEventListener?.('wheel', cancel)
    scrollRoot.removeEventListener?.('touchstart', cancel)
    scrollRoot.removeEventListener?.('pointerdown', cancel)
    keyboardTarget?.removeEventListener?.('keydown', cancelForKeyboard)
    if (activeAnchorLocks.get(scrollRoot) === cancel) activeAnchorLocks.delete(scrollRoot)
  }

  const correctPosition = () => {
    correctionFrame = null
    if (stopped || element.isConnected === false) {
      cancel()
      return
    }

    const targetTop = getElementScrollTop(element, scrollRoot, toolbarHeight)
    if (Math.abs(targetTop - scrollRoot.scrollTop) > ANCHOR_POSITION_TOLERANCE_PX) {
      scrollRoot.scrollTo({ top: targetTop, behavior: 'auto' })
    }
  }

  function scheduleCorrection() {
    if (stopped || correctionTimer != null || correctionFrame != null) return
    correctionFrame = typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame(correctPosition)
      : globalThis.setTimeout(correctPosition, 0)
  }

  function cancelForKeyboard(event) {
    if (USER_SCROLL_KEYS.has(event?.key)) cancel()
  }

  const settleDelay = behavior === 'smooth' ? Math.max(0, smoothSettleDelay) : 0
  correctionTimer = globalThis.setTimeout(() => {
    correctionTimer = null
    scheduleCorrection()
  }, settleDelay)
  const expiryTimer = globalThis.setTimeout(cancel, Math.max(settleDelay, lockDuration))

  if (layoutRoot) {
    layoutRoot.addEventListener?.('load', scheduleCorrection, true)
    if (typeof globalThis.ResizeObserver === 'function') {
      resizeObserver = new globalThis.ResizeObserver(scheduleCorrection)
      resizeObserver.observe(layoutRoot)
    }
    if (typeof globalThis.MutationObserver === 'function') {
      mutationObserver = new globalThis.MutationObserver(scheduleCorrection)
      mutationObserver.observe(layoutRoot, { childList: true, subtree: true })
    }
  }

  scrollRoot.addEventListener?.('wheel', cancel, { passive: true })
  scrollRoot.addEventListener?.('touchstart', cancel, { passive: true })
  scrollRoot.addEventListener?.('pointerdown', cancel, { passive: true })
  keyboardTarget?.addEventListener?.('keydown', cancelForKeyboard)
  globalThis.document?.fonts?.ready?.then(scheduleCorrection, () => {})

  activeAnchorLocks.set(scrollRoot, cancel)
  return cancel
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
