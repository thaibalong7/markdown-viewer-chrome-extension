// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attachTooltip } from '../dom-tooltip.js'
import { createArticle, cleanDom, fire } from '../react/content/__tests__/dom-test-helpers.js'

function harness() {
  const article = createArticle()
  const anchor = document.createElement('button')
  article.append(anchor)
  anchor.getBoundingClientRect = () => ({ left: 100, top: 20, bottom: 60, width: 148 })
  return { anchor, tooltip: attachTooltip(anchor, { text: 'Resolution details' }), root: article.parentElement }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanDom(); vi.useRealTimers() })

describe('DOM-anchor adapter with React tooltip rendering', () => {
  it('updates an open tooltip and cancels pending opens when suppressed', () => {
    const h = harness()
    fire(h.anchor, 'pointerenter')
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]').textContent).toBe('Resolution details')
    h.tooltip.setText('Maximum ×3.25')
    expect(h.root.querySelector('[role="tooltip"]').textContent).toBe('Maximum ×3.25')
    h.tooltip.setText('')
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
    fire(h.anchor, 'pointerenter')
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
    h.tooltip.setText('Ready again')
    h.anchor.focus()
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]').textContent).toBe('Ready again')
    h.tooltip.destroy()
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
  })
  it('cannot reopen after its owner is destroyed', () => {
    const h = harness()
    fire(h.anchor, 'pointerenter')
    h.tooltip.destroy()
    vi.advanceTimersByTime(280)
    fire(h.anchor, 'pointerenter')
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('can hide without losing the anchor subscription or text', () => {
    const h = harness()
    fire(h.anchor, 'pointerenter')
    h.tooltip.hide()
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
    h.anchor.focus()
    vi.advanceTimersByTime(280)
    expect(h.root.querySelector('[role="tooltip"]').textContent).toBe('Resolution details')
    h.tooltip.hide()
    expect(h.root.querySelector('[role="tooltip"]')).toBeNull()
    h.tooltip.destroy()
  })
})
