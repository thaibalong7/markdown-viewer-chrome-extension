const IDLE_MS = 1500

/** Keep automatic article replacement away from scrolling, selection and focused links. */
export function createReadingActivityGuard({ eventTarget, getArticleEl, getInteractionRoot }) {
  let lastInput = -Infinity
  let pointerDown = false
  const activity = () => { lastInput = Date.now() }
  const down = () => { pointerDown = true; activity() }
  const up = () => { pointerDown = false; activity() }
  const release = () => { pointerDown = false }
  const events = [
    ['wheel', activity], ['touchmove', activity], ['scroll', activity],
    ['keydown', activity], ['pointerdown', down], ['pointerup', up],
    ['pointercancel', up], ['visibilitychange', release]
  ]
  return {
    start() {
      for (const [name, listener] of events) eventTarget?.addEventListener?.(name, listener, { capture: true, passive: true })
      eventTarget?.defaultView?.addEventListener?.('blur', release)
    },
    isActive() {
      if (pointerDown || Date.now() - lastInput < IDLE_MS) return true
      const article = getArticleEl?.()
      const selection = eventTarget?.getSelection?.()
      if (selection && !selection.isCollapsed &&
        (article?.contains?.(selection.anchorNode) || article?.contains?.(selection.focusNode))) return true
      if (article?.contains?.(eventTarget?.activeElement)) return true
      return Boolean(getInteractionRoot?.()?.querySelector?.('[data-mdp-watch-open="true"]'))
    },
    destroy() {
      for (const [name, listener] of events) eventTarget?.removeEventListener?.(name, listener, { capture: true })
      eventTarget?.defaultView?.removeEventListener?.('blur', release)
    }
  }
}
