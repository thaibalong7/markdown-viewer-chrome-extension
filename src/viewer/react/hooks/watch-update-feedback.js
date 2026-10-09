const UPDATE_BUSY_MIN_MS = 720
const UPDATE_SUCCESS_MS = 1000

// Presentation timing never delays disk I/O. Success requires a changed
// accepted source and a completed manual request for the same document.
export function createWatchUpdateFeedback(publish) {
  let phase = null
  let operation = null
  let latest = {}
  let generation
  let timer = null
  const show = (next) => {
    if (phase === next) return
    phase = next
    publish(next)
  }
  const cancel = (notify = true) => {
    clearTimeout(timer)
    timer = null
    operation = null
    if (notify) show(null)
    else phase = null
  }
  const settle = () => {
    timer = null
    if (!operation || latest.manualChecking) return
    const changed = operation.sawChecking && latest.acceptedSource !== operation.source
    operation = null
    if (changed && !latest.error && !latest.pending) {
      show('success')
      timer = setTimeout(() => { timer = null; show(null) }, UPDATE_SUCCESS_MS)
    } else show(null)
  }
  return {
    start(state) {
      cancel()
      latest = state
      generation = state.generation
      operation = { source: state.acceptedSource, start: Date.now(), sawChecking: false }
      show('busy')
      // Also recover if the caller declines a request without emitting busy.
      timer = setTimeout(settle, UPDATE_BUSY_MIN_MS)
    },
    sync(state) {
      latest = state
      if (!state.available || !state.supported || state.mode === 'auto' || state.isEditMode || state.error ||
          (phase && state.generation !== generation)) {
        cancel()
        return
      }
      if (phase === 'success' && state.pending) cancel()
      if (!operation) return
      if (state.manualChecking) {
        operation.sawChecking = true
        clearTimeout(timer)
        timer = null
      } else if (operation.sawChecking && timer === null) {
        timer = setTimeout(settle, Math.max(0, UPDATE_BUSY_MIN_MS - (Date.now() - operation.start)))
      }
    },
    cancel
  }
}
