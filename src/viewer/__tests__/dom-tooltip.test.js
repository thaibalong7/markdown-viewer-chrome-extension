import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attachTooltip } from '../dom-tooltip.js'

class Element {
  constructor(doc) {
    this.ownerDocument = doc
    this.listeners = {}
    this.style = {}
    this.isConnected = true
    this.offsetWidth = 160
    this.offsetHeight = 32
  }
  addEventListener(name, listener) { this.listeners[name] = listener }
  removeEventListener(name) { delete this.listeners[name] }
  setAttribute() {}
  getRootNode() { return this.ownerDocument }
  closest() { return this.ownerDocument.root }
  getBoundingClientRect() { return { left: 100, top: 20, bottom: 60, width: 148 } }
  remove() { this.ownerDocument.root.children = this.ownerDocument.root.children.filter((node) => node !== this) }
}

function harness() {
  const win = { innerWidth: 800, innerHeight: 600, setTimeout, clearTimeout,
    addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const root = { children: [], appendChild(node) { this.children.push(node) } }
  const doc = { defaultView: win, root, createElement() { return new Element(doc) } }
  const anchor = new Element(doc)
  const tooltip = attachTooltip(anchor, { text: 'Resolution details' })
  return { anchor, tooltip, root, win }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('HTMLElement', Element)
  vi.stubGlobal('ShadowRoot', class {})
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('imperative Viewer tooltip updates', () => {
  it('updates an open tooltip and hides/cancels it when content is suppressed', () => {
    const h = harness()
    h.anchor.listeners.pointerenter()
    vi.advanceTimersByTime(280)
    expect(h.root.children).toHaveLength(1)
    h.tooltip.setText('Maximum ×3.25')
    expect(h.root.children[0].textContent).toBe('Maximum ×3.25')
    h.tooltip.setText('')
    expect(h.root.children).toHaveLength(0)
    h.anchor.listeners.pointerenter()
    vi.advanceTimersByTime(280)
    expect(h.root.children).toHaveLength(0)
    h.tooltip.setText('Ready again')
    h.anchor.listeners.focusin()
    vi.advanceTimersByTime(280)
    expect(h.root.children[0].textContent).toBe('Ready again')
    h.tooltip.destroy()
    expect(h.root.children).toHaveLength(0)
    expect(h.win.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('cannot show a pending tooltip after its owner closes', () => {
    const h = harness()
    h.anchor.listeners.pointerenter()
    h.tooltip.destroy()
    vi.advanceTimersByTime(280)
    expect(h.root.children).toHaveLength(0)
    expect(h.anchor.listeners).toEqual({})
    expect(h.win.addEventListener).not.toHaveBeenCalled()
  })

  it('can hide a tip without destroying its listeners or text', () => {
    const h = harness()
    h.anchor.listeners.pointerenter()
    h.tooltip.hide()
    vi.advanceTimersByTime(280)
    expect(h.root.children).toHaveLength(0)
    h.anchor.listeners.focusin()
    vi.advanceTimersByTime(280)
    expect(h.root.children[0].textContent).toBe('Resolution details')
    h.tooltip.hide()
    expect(h.root.children).toHaveLength(0)
  })
})
