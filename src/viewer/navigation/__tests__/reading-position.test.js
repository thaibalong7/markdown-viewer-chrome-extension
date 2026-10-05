import { describe, expect, it, vi } from 'vitest'
import { captureReadingPosition, restoreReadingPosition } from '../reading-position.js'

function harness() {
  const root = Object.assign(new EventTarget(), {
    scrollTop: 250, scrollHeight: 1100, clientHeight: 100,
    getBoundingClientRect: () => ({ top: 0 }), scrollTo: vi.fn()
  })
  const heading = (id, text, top) => ({ id, textContent: text,
    getBoundingClientRect: () => ({ top: top - root.scrollTop }) })
  let headings = [heading('first', 'First', 0), heading('second', 'Second', 200)]
  return { root, heading, article: { querySelectorAll: () => headings },
    headings: (next) => { headings = next } }
}

describe('reading position', () => {
  it.each(['pointerdown', 'Enter', 'ArrowDown'])('cancels restoration after %s outside the scroll root', (input) => {
    const h = harness()
    const document = new EventTarget()
    h.root.ownerDocument = document
    const snapshot = captureReadingPosition(h.root, h.article)
    const event = new Event(input === 'pointerdown' ? input : 'keydown')
    event.key = input
    document.dispatchEvent(event)
    restoreReadingPosition(snapshot, h.article)
    expect(h.root.scrollTo).not.toHaveBeenCalled()
    snapshot.dispose()
    snapshot.userMoved = false
    document.dispatchEvent(event)
    expect(snapshot.userMoved).toBe(false)
  })

  it('keeps section offset when content above grows', () => {
    const h = harness()
    const snapshot = captureReadingPosition(h.root, h.article)
    h.headings([h.heading('first', 'First', 0), h.heading('second', 'Second', 500)])
    restoreReadingPosition(snapshot, h.article)
    expect(h.root.scrollTo).toHaveBeenCalledWith({ top: 550, behavior: 'auto' })
    snapshot.dispose()
  })

  it('finds the same heading text if its id changes', () => {
    const h = harness()
    const snapshot = captureReadingPosition(h.root, h.article)
    h.headings([h.heading('second-2', 'Second', 600)])
    restoreReadingPosition(snapshot, h.article)
    expect(h.root.scrollTo).toHaveBeenCalledWith({ top: 650, behavior: 'auto' })
    snapshot.dispose()
  })

  it('falls back to ratio when a section is deleted, even if its id is reused', () => {
    const h = harness()
    const snapshot = captureReadingPosition(h.root, h.article)
    h.headings([h.heading('second', 'Different section', 500)])
    h.root.scrollHeight = 2100
    restoreReadingPosition(snapshot, h.article)
    expect(h.root.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'auto' })
    snapshot.dispose()
  })

  it('does not pull the reader back after user input during rendering', () => {
    const h = harness()
    const snapshot = captureReadingPosition(h.root, h.article)
    h.root.dispatchEvent(new Event('wheel'))
    restoreReadingPosition(snapshot, h.article)
    expect(h.root.scrollTo).not.toHaveBeenCalled()
    snapshot.dispose()
  })
})
