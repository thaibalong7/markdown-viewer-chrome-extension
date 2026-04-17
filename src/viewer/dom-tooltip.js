import { VIEWER_TOOLTIP_DELAY_DEFAULT_MS } from '../shared/constants/tooltip.js'

/**
 * Lightweight hover/focus tooltips for imperative viewer DOM (plugins).
 * @param {HTMLElement} anchor
 * @param {object} [options]
 * @param {string} options.text
 * @param {number} [options.showDelayMs]
 * @returns {{ destroy: () => void }}
 */
export function attachTooltip(anchor, { text, showDelayMs = VIEWER_TOOLTIP_DELAY_DEFAULT_MS } = {}) {
  if (!(anchor instanceof HTMLElement) || !text) {
    return { destroy() {} }
  }

  const doc = anchor.ownerDocument
  const win = doc.defaultView || window
  let tipEl = null
  let showTimer = 0

  function portalParent() {
    const root = anchor.getRootNode()
    if (root instanceof ShadowRoot) return root
    return doc.body
  }

  function positionTip() {
    if (!tipEl) return
    const rect = anchor.getBoundingClientRect()
    const margin = 8
    const pad = 6
    const viewportWidth = win.innerWidth
    const viewportHeight = win.innerHeight

    tipEl.style.position = 'fixed'
    tipEl.style.zIndex = '2147483646'

    const tipWidth = tipEl.offsetWidth
    const tipHeight = tipEl.offsetHeight
    let top = rect.bottom + margin
    let left = rect.left + rect.width / 2 - tipWidth / 2

    if (left < pad) left = pad
    if (left + tipWidth > viewportWidth - pad) left = Math.max(pad, viewportWidth - pad - tipWidth)
    if (top + tipHeight > viewportHeight - pad && rect.top - margin - tipHeight >= pad) {
      top = rect.top - margin - tipHeight
    }
    if (top + tipHeight > viewportHeight - pad) top = Math.max(pad, viewportHeight - pad - tipHeight)

    tipEl.style.top = `${Math.round(top)}px`
    tipEl.style.left = `${Math.round(left)}px`
  }

  function onReposition() {
    positionTip()
  }

  function hide() {
    if (showTimer) {
      win.clearTimeout(showTimer)
      showTimer = 0
    }
    if (!tipEl) return
    win.removeEventListener('scroll', onReposition, true)
    win.removeEventListener('resize', onReposition)
    tipEl.remove()
    tipEl = null
  }

  function show() {
    if (tipEl || !anchor.isConnected) return
    tipEl = doc.createElement('div')
    tipEl.className = 'mdp-tooltip'
    tipEl.setAttribute('role', 'tooltip')
    tipEl.textContent = text
    portalParent().appendChild(tipEl)
    positionTip()
    win.addEventListener('scroll', onReposition, true)
    win.addEventListener('resize', onReposition)
  }

  function scheduleShow() {
    if (showTimer) win.clearTimeout(showTimer)
    showTimer = win.setTimeout(() => {
      showTimer = 0
      show()
    }, showDelayMs)
  }

  const onPointerEnter = () => scheduleShow()
  const onPointerLeave = () => hide()
  const onFocusIn = () => scheduleShow()
  const onFocusOut = () => hide()

  anchor.addEventListener('pointerenter', onPointerEnter)
  anchor.addEventListener('pointerleave', onPointerLeave)
  anchor.addEventListener('focusin', onFocusIn)
  anchor.addEventListener('focusout', onFocusOut)

  return {
    destroy() {
      anchor.removeEventListener('pointerenter', onPointerEnter)
      anchor.removeEventListener('pointerleave', onPointerLeave)
      anchor.removeEventListener('focusin', onFocusIn)
      anchor.removeEventListener('focusout', onFocusOut)
      hide()
    }
  }
}
