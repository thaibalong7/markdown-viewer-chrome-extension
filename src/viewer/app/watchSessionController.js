import { logger } from '../../shared/logger.js'
import { createReadingActivityGuard } from './readingActivityGuard.js'

const POLL_MS = 2000
const CONFIRM_MS = 400
const AUTO_CONFIRM_MS = 1500
const AUTO_APPLY_INTERVAL_MS = 5000

function delay(ms, signal) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
}

/** Watches one session revision. Reads never overlap; stale results never reach the article. */
export function createWatchSessionController({
  session,
  getMode,
  isEditorProtected,
  isSaving,
  prepareToApply,
  publish,
  showToast,
  getArticleEl,
  getInteractionRoot,
  visibility = globalThis.document
}) {
  let timer = null
  let request = null
  let queuedManual = null
  let pending = null
  let errors = 0
  let destroyed = false
  let started = false
  let lastApplied = -Infinity
  let pendingId = 0
  const reading = createReadingActivityGuard({ eventTarget: visibility, getArticleEl, getInteractionRoot })
  let state = { manualChecking: false, pending: false, error: null, supported: false }

  const visible = () => visibility?.visibilityState !== 'hidden'
  const mode = () => getMode?.() || 'ask'
  const valid = (target, signal) => !destroyed && visible() && !signal.aborted && !isSaving?.() &&
    session.matchesWatchTarget(target)

  function emit(patch = {}) {
    const target = session.getWatchTarget()
    const previous = session.getPreviousRevision?.()
    const currentPending = pending && session.matchesWatchTarget(pending.target) && pending.text !== target?.acceptedSource
    const pendingPair = target && currentPending ? {
      id: `${target.generation}:${target.sourceRevision}:pending:${pending.id}`,
      generation: target.generation,
      before: target.acceptedSource, after: pending.text, kind: 'pending'
    } : null
    const appliedPair = target && previous ? {
      id: `${target.generation}:${previous.id}:${target.sourceRevision}`,
      generation: target.generation,
      before: previous.source, after: target.acceptedSource, kind: 'applied'
    } : null
    const editorProtected = isEditorProtected?.()
    const reviewPair = editorProtected ? pendingPair : mode() === 'auto' ? appliedPair : pendingPair || appliedPair
    const latestReviewPair = editorProtected ? pendingPair : pendingPair || appliedPair
    state = { ...state, ...patch, mode: mode(), available: Boolean(target), supported: target?.supported === true,
      generation: target?.generation, acceptedSource: target?.acceptedSource, reviewPair, latestReviewPair }
    publish?.(state)
  }

  function rememberPending(target, text) {
    if (pending?.text === text && session.matchesWatchTarget(pending.target)) return
    pending = { target, text, id: ++pendingId }
  }

  function schedule() {
    clearTimeout(timer)
    timer = null
    if (!destroyed && started && !request && visible() && mode() !== 'off' && session.getWatchTarget()?.supported) {
      timer = setTimeout(() => { void check() }, Math.min(30000, POLL_MS * 2 ** errors))
    }
  }

  async function apply(target, text, manual, signal, applyContext) {
    if (!valid(target, signal)) return false
    if (!manual && (mode() !== 'auto' || isEditorProtected?.())) return false
    if (!manual && (reading.isActive() || Date.now() - lastApplied < AUTO_APPLY_INTERVAL_MS)) {
      emit({ pending: true, deferred: true })
      return false
    }
    if (manual && await prepareToApply?.(applyContext) === false) return false
    if (!valid(target, signal)) return false
    const applied = await session.applyCurrentRevision(target, text)
    if (applied && !destroyed) {
      pending = null
      lastApplied = Date.now()
      emit({ pending: false, deferred: false, error: null })
      if (manual) showToast?.('Document updated', { variant: 'success' })
    }
    return applied
  }

  async function check({ manual = false, applyPending = false, applyContext } = {}) {
    if (destroyed || !visible()) return false
    if (request) {
      if (manual && !state.manualChecking) {
        queuedManual = { manual: true, applyPending, applyContext }
        request.abort()
        emit({ manualChecking: true })
      }
      return false
    }
    const target = session.getWatchTarget()
    if (!target?.supported || (!manual && mode() === 'off') || isSaving?.()) {
      emit()
      schedule()
      return false
    }
    clearTimeout(timer)
    const controller = new AbortController()
    request = controller
    const signal = controller.signal
    emit({ manualChecking: manual })
    try {
      const text = await session.readCurrentRevision(target, signal)
      if (!valid(target, signal) || text === null) return false
      if (text === target.acceptedSource) {
        pending = null
        errors = 0
        emit({ pending: false, deferred: false, error: null })
        return true
      }
      await delay(!manual && mode() === 'auto' ? AUTO_CONFIRM_MS : CONFIRM_MS, signal)
      if (!valid(target, signal)) return false
      const confirmed = await session.readCurrentRevision(target, signal)
      if (!valid(target, signal) || confirmed === null) return false
      errors = 0
      if (confirmed !== text) {
        // Keep the existing update indicator stable throughout a burst of writes.
        rememberPending(target, confirmed)
        emit({ pending: confirmed !== target.acceptedSource, deferred: mode() === 'auto', error: null })
        return false
      }
      rememberPending(target, text)
      emit({ pending: true, deferred: false, error: null })
      if (applyPending || (mode() === 'auto' && !isEditorProtected?.())) {
        await apply(target, text, applyPending, signal, applyContext)
      }
      return true
    } catch (error) {
      if (signal.aborted || destroyed || !session.matchesWatchTarget(target)) return false
      ++errors
      pending = null
      logger.warn('Could not check the current Markdown file for changes.', {
        message: error instanceof Error ? error.message : String(error)
      })
      emit({ pending: false, error: error?.code === 'document-too-large'
        ? 'Watch supports Markdown files up to 5 MiB. The current content was kept.'
        : 'Could not read the file. The current content was kept. Check file access and try again.' })
      return false
    } finally {
      if (request === controller) request = null
      if (!destroyed) {
        const next = queuedManual
        queuedManual = null
        emit({ manualChecking: false })
        if (next) void check(next)
        else schedule()
      }
    }
  }

  function reset() {
    clearTimeout(timer)
    timer = null
    request?.abort()
    queuedManual = null
    pending = null
    errors = 0
    lastApplied = -Infinity
    emit({ pending: false, deferred: false, error: null })
    // If a read is in flight its finally schedules the next check, without overlap.
    if (!request) schedule()
  }

  function onVisibilityChange() {
    clearTimeout(timer)
    timer = null
    request?.abort()
    queuedManual = null
    if (visible() && !request && mode() !== 'off') void check()
  }

  return {
    start() {
      if (started || destroyed) return
      started = true
      reading.start()
      visibility?.addEventListener?.('visibilitychange', onVisibilityChange)
      emit()
      if (mode() !== 'off') void check()
    },
    reset,
    documentReady() {
      if (destroyed) return
      emit()
      schedule()
    },
    settingsChanged() {
      request?.abort()
      queuedManual = null
      emit()
      schedule()
    },
    check: () => check({ manual: true }),
    applyPending: (applyContext) => pending ? check({ manual: true, applyPending: true, applyContext }) : Promise.resolve(false),
    destroy() {
      if (destroyed) return
      destroyed = true
      clearTimeout(timer)
      request?.abort()
      queuedManual = null
      pending = null
      reading.destroy()
      visibility?.removeEventListener?.('visibilitychange', onVisibilityChange)
    }
  }
}
