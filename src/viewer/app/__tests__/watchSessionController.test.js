import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWatchSessionController } from '../watchSessionController.js'

function deferred() {
  let resolve
  return { promise: new Promise((done) => { resolve = done }), resolve: (value) => resolve(value) }
}

function harness() {
  let target = { document: {}, generation: 0, revision: 0, sourceRevision: 0, acceptedSource: 'old', supported: true }
  let previousRevision = null
  let disk = 'old'
  let mode = 'ask'
  let protectedEditor = false
  let saving = false
  let state
  const visibility = new EventTarget()
  visibility.visibilityState = 'visible'
  const session = {
    getWatchTarget: () => target,
    getPreviousRevision: () => previousRevision,
    matchesWatchTarget: (value) => value === target,
    readCurrentRevision: vi.fn(async () => disk),
    applyCurrentRevision: vi.fn(async (_, text) => {
      previousRevision = { source: target.acceptedSource, id: target.sourceRevision }
      target = { ...target, acceptedSource: text, revision: target.revision + 1, sourceRevision: target.sourceRevision + 1 }
      return true
    })
  }
  const prepareToApply = vi.fn(() => true)
  const showToast = vi.fn()
  const watch = createWatchSessionController({
    session, visibility, getMode: () => mode, isEditorProtected: () => protectedEditor,
    isSaving: () => saving, prepareToApply, showToast,
    publish: (value) => { state = value }
  })
  return {
    watch, session, visibility, prepareToApply, showToast,
    state: () => state,
    disk: (value) => { disk = value },
    mode: (value) => { mode = value; watch.settingsChanged() },
    protectedEditor: (value) => { protectedEditor = value },
    saving: (value) => { saving = value },
    navigate: () => { target = { ...target, document: {}, generation: target.generation + 1 }; watch.reset() }
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('Markdown watch lifecycle', () => {
  it('publishes stable pending pairs, advances on new disk content, and retains the last applied comparison', async () => {
    const h = harness()
    h.disk('first')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(400)
    const first = h.state().reviewPair
    expect(first).toMatchObject({ before: 'old', after: 'first', kind: 'pending' })
    await vi.advanceTimersByTimeAsync(2400)
    expect(h.state().reviewPair.id).toBe(first.id)
    h.disk('second')
    await vi.advanceTimersByTimeAsync(2400)
    expect(h.state().reviewPair).toMatchObject({ before: 'old', after: 'second' })
    expect(first.after).toBe('first')
    const apply = h.watch.applyPending()
    await vi.advanceTimersByTimeAsync(400)
    await apply
    expect(h.state().reviewPair).toMatchObject({ before: 'old', after: 'second', kind: 'applied' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(h.state().reviewPair.after).toBe('second')
    h.watch.destroy()
  })

  it('reviews only the previous automatic apply and keeps edit-mode comparisons on the accepted baseline', async () => {
    const h = harness()
    h.mode('auto')
    h.disk('one')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(1500)
    expect(h.state().reviewPair).toMatchObject({ before: 'old', after: 'one', kind: 'applied' })
    h.disk('two')
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.state().reviewPair).toMatchObject({ before: 'old', after: 'one', kind: 'applied' })
    expect(h.state().latestReviewPair).toMatchObject({ before: 'one', after: 'two', kind: 'pending' })
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.state().reviewPair).toMatchObject({ before: 'one', after: 'two', kind: 'applied' })
    h.protectedEditor(true)
    h.watch.documentReady()
    expect(h.state().reviewPair).toBeNull()
    h.disk('three')
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.state().reviewPair).toMatchObject({ before: 'two', after: 'three', kind: 'pending' })
    h.watch.destroy()
  })
  it('does not render unchanged source and polls only while visible', async () => {
    const h = harness()
    h.watch.start()
    await vi.advanceTimersByTimeAsync(2000)
    expect(h.session.readCurrentRevision).toHaveBeenCalledTimes(2)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.visibility.visibilityState = 'hidden'
    h.visibility.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(10000)
    expect(h.session.readCurrentRevision).toHaveBeenCalledTimes(2)
    h.visibility.visibilityState = 'visible'
    h.visibility.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(h.session.readCurrentRevision).toHaveBeenCalledTimes(3)
    h.watch.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('confirms a change, asks first, and rereads the latest disk before applying', async () => {
    const h = harness()
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(400)
    expect(h.state().pending).toBe(true)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.disk('newest')
    const applyContext = { editorExitConfirmed: true }
    const apply = h.watch.applyPending(applyContext)
    await vi.advanceTimersByTimeAsync(400)
    await apply
    expect(h.prepareToApply).toHaveBeenCalledWith(applyContext)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledWith(expect.any(Object), 'newest')
    expect(h.state().pending).toBe(false)
    h.watch.destroy()
  })

  it('auto applies an empty file but never replaces an active editor', async () => {
    const h = harness()
    h.mode('auto')
    h.disk('')
    h.protectedEditor(true)
    h.watch.start()
    await vi.advanceTimersByTimeAsync(1500)
    expect(h.state().pending).toBe(true)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.protectedEditor(false)
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledWith(expect.any(Object), '')
    h.watch.destroy()
  })

  it('keeps a dirty draft when the user declines loading the update', async () => {
    const h = harness()
    h.disk('new')
    h.protectedEditor(true)
    h.prepareToApply.mockReturnValue(false)
    h.watch.start()
    await vi.advanceTimersByTimeAsync(400)
    const apply = h.watch.applyPending()
    await vi.advanceTimersByTimeAsync(400)
    await apply
    expect(h.state().pending).toBe(true)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.watch.destroy()
  })

  it('clears pending when disk returns to the accepted baseline', async () => {
    const h = harness()
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(400)
    h.disk('old')
    await vi.advanceTimersByTimeAsync(2000)
    expect(h.state().pending).toBe(false)
    h.watch.destroy()
  })

  it('keeps a pending indicator without applying source that is still changing', async () => {
    const h = harness()
    h.disk('partial')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(100)
    h.disk('complete')
    await vi.advanceTimersByTimeAsync(300)
    expect(h.state().pending).toBe(true)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2400)
    expect(h.state().pending).toBe(true)
    h.watch.destroy()
  })

  it('off disables polling while retaining explicit checks', async () => {
    const h = harness()
    h.mode('off')
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(10000)
    expect(h.session.readCurrentRevision).not.toHaveBeenCalled()
    const check = h.watch.check()
    await vi.advanceTimersByTimeAsync(400)
    await check
    expect(h.state().pending).toBe(true)
    h.watch.destroy()
  })

  it.each(['navigate', 'hide', 'off', 'destroy'])('ignores late source after %s and never overlaps reads', async (action) => {
    const h = harness()
    const read = deferred()
    h.mode('auto')
    h.session.readCurrentRevision.mockReturnValueOnce(read.promise)
    h.watch.start()
    await h.watch.check()
    expect(h.session.readCurrentRevision).toHaveBeenCalledOnce()
    if (action === 'navigate') h.navigate()
    if (action === 'hide') {
      h.visibility.visibilityState = 'hidden'
      h.visibility.dispatchEvent(new Event('visibilitychange'))
    }
    if (action === 'off') h.mode('off')
    if (action === 'destroy') h.watch.destroy()
    read.resolve('late')
    await vi.advanceTimersByTimeAsync(400)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    expect(h.state().pending).toBe(false)
    h.watch.destroy()
  })

  it('preserves the document on errors, backs off, and recovers on manual retry', async () => {
    const h = harness()
    h.session.readCurrentRevision.mockRejectedValueOnce(new Error('access denied'))
    h.watch.start()
    await vi.advanceTimersByTimeAsync(2000)
    expect(h.state().error).toContain('current content was kept')
    expect(h.session.readCurrentRevision).toHaveBeenCalledOnce()
    await h.watch.check()
    expect(h.state().error).toBeNull()
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.watch.destroy()
  })

  it('ignores changed source if Save starts during a read', async () => {
    const h = harness()
    const read = deferred()
    h.mode('auto')
    h.session.readCurrentRevision.mockReturnValueOnce(read.promise)
    h.watch.start()
    h.saving(true)
    read.resolve('new')
    await vi.advanceTimersByTimeAsync(400)
    expect(h.state().pending).toBe(false)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.watch.destroy()
  })
})


describe('continuous changes while reading', () => {
  it('clears a previous read error when a recovered update is deferred by user activity', async () => {
    const h = harness()
    h.mode('auto')
    h.session.readCurrentRevision.mockRejectedValueOnce(new Error('temporarily unavailable'))
    h.watch.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.state().error).toBeTruthy()
    h.disk('recovered')
    await vi.advanceTimersByTimeAsync(5000)
    h.visibility.dispatchEvent(new Event('wheel'))
    await vi.advanceTimersByTimeAsync(500)
    expect(h.state()).toMatchObject({ pending: true, deferred: true, error: null })
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    h.watch.destroy()
  })

  it('does not restart an explicit update when the user requests it twice', async () => {
    const h = harness()
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(400)
    const apply = h.watch.applyPending()
    await vi.advanceTimersByTimeAsync(200)
    await h.watch.applyPending()
    await vi.advanceTimersByTimeAsync(200)
    await apply
    expect(h.session.applyCurrentRevision).toHaveBeenCalledOnce()
    expect(h.state()).toMatchObject({ pending: false, manualChecking: false })
    h.watch.destroy()
  })

  it('waits for a stable file and rate limits automatic renders without toasts', async () => {
    const h = harness()
    h.mode('auto')
    h.disk('first')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(500)
    h.disk('second')
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    expect(h.state()).toMatchObject({ pending: true, deferred: true })
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledTimes(1)
    h.disk('third')
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledTimes(1)
    expect(h.state().pending).toBe(true)
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledTimes(2)
    expect(h.session.applyCurrentRevision).toHaveBeenLastCalledWith(expect.any(Object), 'third')
    expect(h.showToast).not.toHaveBeenCalled()
    h.watch.destroy()
  })

  it('defers replacement while scrolling and applies after reading becomes idle', async () => {
    const h = harness()
    h.mode('auto')
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(1000)
    h.visibility.dispatchEvent(new Event('wheel'))
    await vi.advanceTimersByTimeAsync(500)
    expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
    expect(h.state()).toMatchObject({ pending: true, deferred: true })
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.session.applyCurrentRevision).toHaveBeenCalledOnce()
    h.watch.destroy()
  })

  it('allows an explicit update during an automatic cooldown', async () => {
    const h = harness()
    h.mode('auto')
    h.disk('new')
    h.watch.start()
    await vi.advanceTimersByTimeAsync(1500)
    h.disk('latest')
    await vi.advanceTimersByTimeAsync(3500)
    expect(h.state().pending).toBe(true)
    const apply = h.watch.applyPending()
    await vi.advanceTimersByTimeAsync(400)
    await apply
    expect(h.session.applyCurrentRevision).toHaveBeenLastCalledWith(expect.any(Object), 'latest')
    expect(h.showToast).toHaveBeenCalledOnce()
    h.watch.destroy()
  })
})


it('prioritizes a user check over an in-flight background read without overlapping', async () => {
  const h = harness()
  const read = deferred()
  h.session.readCurrentRevision.mockReturnValueOnce(read.promise)
  h.watch.start()
  h.disk('latest')
  await h.watch.check()
  expect(h.state().manualChecking).toBe(true)
  expect(h.session.readCurrentRevision).toHaveBeenCalledOnce()
  read.resolve('stale')
  await vi.advanceTimersByTimeAsync(400)
  expect(h.session.readCurrentRevision).toHaveBeenCalledTimes(3)
  expect(h.state()).toMatchObject({ pending: true, manualChecking: false })
  expect(h.session.applyCurrentRevision).not.toHaveBeenCalled()
  h.watch.destroy()
})
