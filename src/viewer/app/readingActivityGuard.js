const IDLE_MS = 1500

/** Keep automatic article replacement away from active reading input without creating persistent locks. */
export function createReadingActivityGuard({ eventTarget }) {
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
      return pointerDown || Date.now() - lastInput < IDLE_MS
    },
    destroy() {
      for (const [name, listener] of events) eventTarget?.removeEventListener?.(name, listener, { capture: true })
      eventTarget?.defaultView?.removeEventListener?.('blur', release)
    }
  }
}
