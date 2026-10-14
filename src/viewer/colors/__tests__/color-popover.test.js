import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createColorPopover } from '../color-popover.js'

const mocks = vi.hoisted(() => ({ copy: vi.fn(), warn: vi.fn(), tooltip: vi.fn() }))
vi.mock('../../../shared/clipboard.js', () => ({ copyTextToClipboard: mocks.copy }))
vi.mock('../../../shared/logger.js', () => ({ logger: { warn: mocks.warn } }))
vi.mock('../../../shared/icons/create-app-icon.js', () => ({
  SVG_NS: 'http://www.w3.org/2000/svg',
  createAppIconSvg: (name, { className }) => ({ tagName: 'svg', name, className, setAttribute() {}, outerHTML: '<svg></svg>', querySelectorAll: () => [], contains: () => false,
    remove() { this.parent.children = this.parent.children.filter(child => child !== this) } })
}))
vi.mock('../../dom-tooltip.js', () => ({ attachTooltip: mocks.tooltip }))

// Small DOM/event adapter for lifecycle tests; rendering/layout is checked in the browser.
class Node {
  constructor(doc, tag = 'div') {
    this.ownerDocument = doc
    this.tagName = tag
    this.children = []
    this.attributes = new Map()
    this.listeners = new Map()
    this.dataset = {}
    this.style = { setProperty: (key, value) => { this.style[key] = value }, getPropertyValue: key => this.style[key], removeProperty: key => { delete this.style[key] } }
    this.classList = { add: value => { this.className += ` ${value}` }, remove: (...values) => { values.forEach(value => { this.className = this.className.replace(` ${value}`, '') }) } }
    this.offsetWidth = 264
    this.offsetHeight = 114
    this.textContent = ''
  }
  get isConnected() { return this === this.ownerDocument.root || Boolean(this.parent?.isConnected) }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node) } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null }
  setAttribute(key, value) { this.attributes.set(key, value) }
  removeAttribute(key) { this.attributes.delete(key) }
  getAttribute(key) { return this.attributes.get(key) }
  closest(selector) { return selector === '.mdp-color-swatch' ? this : this.ownerDocument.root }
  matches() { return this.keyboardFocus !== false }
  contains(node) { return this === node || this.children.some(child => child.contains(node)) }
  querySelectorAll(tag) { return this.children.flatMap(child => [...((tag === '[role="status"]' ? child.attributes?.get('role') === 'status' : child.tagName === tag) ? [child] : []), ...child.querySelectorAll(tag)]) }
  querySelector(tag) { return this.querySelectorAll(tag)[0] }
  focus() { if (!this.disabled) { this.ownerDocument.activeElement = this; this.ownerDocument.fire('focusin', { target: this }) } }
  getBoundingClientRect() {
    const left = Number.parseFloat(this.style.left) || 280
    const top = Number.parseFloat(this.style.top) || 60
    const width = this.className === 'mdp-color-popover' ? 264 : 16
    const height = this.className === 'mdp-color-popover' ? 114 : 16
    return { left, top, right: left + width, bottom: top + height, width, height }
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(handler)
  }
  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type)
    handlers?.delete(handler)
    if (!handlers?.size) this.listeners.delete(type)
  }
  fire(type, event = {}) {
    if (type === 'focusin' && !this.ownerDocument) this.activeElement = event.target
    if (type === 'click' && this.tagName === 'button') {
      if (this.disabled) return
      this.focus()
    }
    this.listeners.get(type)?.forEach(handler => handler(event))
  }
}

function harness() {
  const doc = { listeners: new Map(), ...Object.fromEntries(['addEventListener', 'removeEventListener', 'fire'].map(key => [key, Node.prototype[key]])) }
  const win = new Node(doc)
  Object.assign(win, { innerWidth: 640, innerHeight: 480, setTimeout, clearTimeout })
  doc.defaultView = win
  doc.createElement = tag => {
    const node = new Node(doc, tag)
    if (tag === 'span') { node.offsetWidth = 74; node.offsetHeight = 24 }
    return node
  }
  doc.root = new Node(doc)
  const article = new Node(doc)
  const trigger = new Node(doc, 'button')
  trigger.className = 'mdp-color-swatch'
  trigger.dataset.mdpColor = '#3B82F680'
  trigger.setAttribute('aria-label', 'Copy color #3B82F680')
  trigger.style.setProperty('--mdp-preview-color', 'rgba(59, 130, 246, .5)')
  doc.root.append(article)
  article.append(trigger)
  const popover = createColorPopover({ articleEl: article, swatches: new Map([[trigger, { r: 59, g: 130, b: 246, a: 128 / 255 }]]) })
  const open = () => doc.fire('keydown', { key: 'ArrowDown', target: trigger, preventDefault: vi.fn() })
  const click = (point = {}) => { trigger.keyboardFocus = false; trigger.focus(); article.fire('click', { target: trigger, preventDefault: vi.fn(), detail: 1, clientX: 288, clientY: 68, ...point }) }
  const panel = () => doc.root.children.find(node => node.className === 'mdp-color-popover')
  const visual = () => doc.root.children.find(node => node.className?.split(' ').includes('mdp-color-copy-feedback'))
  return { doc, win, article, trigger, popover, open, click, panel, visual }
}

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); mocks.copy.mockResolvedValue(undefined)
  mocks.tooltip.mockImplementation(() => ({ destroy: vi.fn(), hide: vi.fn(), setText: vi.fn() }))
})
afterEach(() => vi.useRealTimers())

describe('color popover interaction lifecycle', () => {
  it('opens on keyboard focus and ArrowDown focuses the first format command without copying', () => {
    const h = harness()
    h.trigger.focus()
    expect(h.panel()).toBeDefined()
    expect(h.doc.activeElement).toBe(h.trigger)
    h.open()
    expect(h.doc.activeElement.getAttribute('aria-label')).toBe('Copy HEX')
    expect(h.trigger.getAttribute('aria-expanded')).toBe('true')
    expect(h.panel().style.left).toBe('280px')
    expect(mocks.copy).not.toHaveBeenCalled()
    h.popover.destroy()
  })

  it('copies the chosen alpha format, restores copy-button focus and clears feedback', async () => {
    const h = harness()
    h.open()
    const button = h.panel().querySelectorAll('button')[1]
    button.fire('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.copy).toHaveBeenCalledWith('rgba(59, 130, 246, 0.5019607843137255)')
    expect(button.className).toContain('is-copied')
    expect(button.textContent).toBe('')
    expect(button.children.map(icon => icon.name)).toEqual(['copy', 'check'])
    expect(button.disabled).toBe(false)
    expect(h.doc.activeElement).toBe(button)
    await vi.runAllTimersAsync()
    expect(button.className).not.toContain('is-copied')
    h.popover.destroy()
  })

  it('surfaces clipboard failures without losing the available values', async () => {
    mocks.copy.mockRejectedValue(new Error('private message'))
    const h = harness()
    h.open()
    const button = h.panel().querySelectorAll('button')[2]
    button.fire('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel().children.at(-1).textContent).toContain('Could not copy')
    expect(button.disabled).toBe(false)
    expect(h.panel().children[2].children[1].children[0].textContent).toBe('hsla(217.219251, 91.219512%, 59.803922%, 0.5019607843137255)')
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain('private message')
    h.popover.destroy()
  })

  it('clears previous success before a failed format copy', async () => {
    const h = harness()
    h.open()
    const button = h.panel().querySelectorAll('button')[1]
    button.fire('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(button.className).toContain('is-copied')
    mocks.copy.mockRejectedValueOnce(new Error('clipboard blocked'))
    button.fire('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(button.className).toContain('is-error')
    expect(button.className).not.toContain('is-copied')
    h.popover.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not steal focus when a pending format copy finishes after focus moved outside', async () => {
    let finish
    mocks.copy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.open()
    const button = h.panel().querySelector('button')
    button.fire('click')
    h.article.focus()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.doc.activeElement === h.article).toBe(true)
    expect(h.panel()).toBeUndefined()
    h.popover.destroy()
  })

  it('waits for every pending format copy before settling fallback focus', async () => {
    const finishes = []
    mocks.copy.mockImplementation(() => new Promise(resolve => { finishes.push(resolve) }))
    const h = harness()
    h.open()
    const buttons = h.panel().querySelectorAll('button')
    buttons[0].fire('click')
    buttons[1].fire('click')
    finishes[0]()
    await vi.advanceTimersByTimeAsync(0)
    h.article.focus()
    expect(h.panel()).toBeDefined()
    finishes[1]()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel()).toBeUndefined()
    expect(h.doc.activeElement === h.article).toBe(true)
    h.popover.destroy()
  })

  it.each(['format', 'source'])('keeps a reopened hover inspector when an older %s copy settles', async kind => {
    let finish
    mocks.copy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.open()
    if (kind === 'format') h.panel().querySelector('button').fire('click')
    else h.click()
    h.doc.fire('keydown', { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() })
    h.article.focus()
    h.article.fire('pointerover', { target: h.trigger })
    vi.advanceTimersByTime(120)
    const panel = h.panel()
    expect(Boolean(panel)).toBe(true)
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel() === panel).toBe(true)
    h.popover.destroy()
  })

  it('dismisses with Escape and restores the swatch without reopening its focus preview', () => {
    const h = harness()
    h.open()
    h.doc.fire('keydown', { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(h.panel()).toBeUndefined()
    expect(h.doc.activeElement).toBe(h.trigger)
    expect(h.trigger.getAttribute('aria-expanded')).toBe('false')
    h.popover.destroy()
  })

  it('dismisses outside the layer, on scrolling and on focus leaving it', () => {
    const h = harness()
    h.open()
    h.doc.fire('pointerdown', { composedPath: () => [h.article] })
    expect(h.panel()).toBeUndefined()
    h.open()
    h.win.fire('scroll', { target: h.article })
    expect(h.panel()).toBeUndefined()
    expect(h.doc.activeElement).toBe(h.trigger)
    h.open()
    h.doc.fire('focusin', { target: h.article })
    expect(h.panel()).toBeUndefined()
    h.popover.destroy()
  })

  it('removes portal, timers and listeners and ignores a clipboard completion after teardown', async () => {
    let finish
    mocks.copy.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.open()
    const button = h.panel().querySelector('button')
    button.fire('click')
    h.popover.destroy()
    h.popover.destroy()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel()).toBeUndefined()
    expect(button.className).not.toContain('is-copied')
    expect(mocks.tooltip.mock.results.every(result => result.value.destroy.mock.calls.length === 1)).toBe(true)
    expect(h.article.listeners.size + h.doc.listeners.size + h.win.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('delays hover opening, cancels fly-by hovers and clears pending opening on cleanup', () => {
    const h = harness()
    h.article.fire('pointerover', { target: h.trigger })
    expect(h.panel()).toBeUndefined()
    vi.advanceTimersByTime(80)
    h.article.fire('pointerout', { target: h.trigger })
    vi.advanceTimersByTime(120)
    expect(h.panel()).toBeUndefined()
    h.article.fire('pointerover', { target: h.trigger })
    vi.advanceTimersByTime(120)
    expect(h.panel()).toBeDefined()
    h.popover.destroy()
    vi.runAllTimers()
    expect(vi.getTimerCount()).toBe(0)
    expect(h.panel()).toBeUndefined()
  })

  it('keeps the preview available while the sample has keyboard focus', () => {
    const h = harness()
    h.trigger.focus()
    h.article.fire('pointerout', { target: h.trigger })
    vi.advanceTimersByTime(500)
    expect(h.panel()).toBeDefined()
    h.popover.destroy()
  })

  it.each(['#b45309', '#AbC', 'RGB( 59, 130, 246 )', 'rgba(59, 130, 246, .5)', 'hsl(120 100% 50% / 25%)'])('copies the exact detected literal on a direct click: %s', async source => {
    const h = harness()
    h.trigger.dataset.mdpColor = source
    h.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.copy).toHaveBeenCalledWith(source)
    expect(h.visual()).toBeDefined()
    expect(h.trigger.textContent).toBe('')
    expect(h.visual().children[1].children[1].textContent).toBe('Copied')
    expect(h.visual().children[1].children[0].name).toBe('check')
    expect(h.article.contains(h.visual())).toBe(false)
    expect(h.trigger.style.getPropertyValue('--mdp-preview-color')).toBe('rgba(59, 130, 246, .5)')
    expect(h.trigger.getAttribute('aria-label')).toBe('Copy color #3B82F680')
    expect(h.doc.activeElement).toBe(h.trigger)
    expect(h.panel()).toBeUndefined()
    await vi.runAllTimersAsync()
    expect(h.visual()).toBeUndefined()
    expect(h.trigger.getAttribute('aria-label')).toBe('Copy color #3B82F680')
    h.popover.destroy()
  })

  it('keeps the hovered inspector intact while copying the source, then dismisses on pointer leave', async () => {
    const h = harness()
    h.article.fire('pointerover', { target: h.trigger })
    vi.advanceTimersByTime(120)
    const panel = h.panel()
    h.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel()).toBe(panel)
    expect(h.doc.activeElement).toBe(h.trigger)
    h.article.fire('pointerout', { target: h.trigger })
    vi.advanceTimersByTime(160)
    expect(h.panel()).toBeUndefined()
    expect(h.visual()).toBeDefined()
    h.popover.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows an error, enables retry and never displays false source-copy success', async () => {
    mocks.copy.mockRejectedValueOnce(new Error('clipboard blocked'))
    const h = harness()
    h.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.trigger.className).toBe('mdp-color-swatch')
    expect(h.visual()).toBeUndefined()
    expect(h.panel().querySelector('[role="status"]').textContent).toContain('Could not copy')
    expect(h.doc.root.querySelectorAll('[role="status"]').filter(node => node.textContent.startsWith('Could not copy'))).toHaveLength(1)
    h.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.visual()).toBeDefined()
    expect(h.panel().querySelector('[role="status"]').textContent).toBe('')
    h.popover.destroy()
  })

  it('ignores source-copy completion after teardown and releases its feedback resources', async () => {
    let finish
    mocks.copy.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.click()
    h.click()
    expect(mocks.copy).toHaveBeenCalledOnce()
    h.popover.destroy()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.trigger.children).toHaveLength(0)
    expect(h.visual()).toBeUndefined()
    expect(h.trigger.getAttribute('aria-busy')).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('dismisses the inspector after a pending source copy without stealing outside focus', async () => {
    let finish
    mocks.copy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.open()
    h.click()
    h.article.focus()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.doc.activeElement === h.article).toBe(true)
    expect(h.panel()).toBeUndefined()
    h.popover.destroy()
  })

  it('shows a single confirmation at the actual click point only after success and restarts on retry', async () => {
    let finish
    mocks.copy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const h = harness()
    h.click({ clientX: 291, clientY: 65 })
    expect(h.visual()).toBeUndefined()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    const first = h.visual()
    expect(first.style.left).toBe('291px')
    expect(first.style.top).toBe('65px')
    expect(first.children[1].style.left).toBe('299px')
    expect(first.children[1].style.top).toBe('33px')
    expect(h.doc.root.querySelector('[role="status"]').textContent).toBe('Copied #3B82F680')
    h.click({ clientX: 285, clientY: 70 })
    expect(h.visual()).toBeUndefined()
    await vi.advanceTimersByTimeAsync(0)
    expect(first.isConnected).toBe(false)
    expect(h.visual().style.left).toBe('285px')
    vi.advanceTimersByTime(1020)
    expect(h.visual().className).toContain('is-leaving')
    vi.advanceTimersByTime(180)
    expect(h.visual()).toBeUndefined()
    h.popover.destroy()
    expect(h.win.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('anchors keyboard activation to the sample center rather than synthetic zero coordinates', async () => {
    const h = harness()
    h.click({ detail: 0, clientX: 0, clientY: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(h.visual().style.left).toBe('288px')
    expect(h.visual().style.top).toBe('68px')
    h.popover.destroy()
  })

  it.each(['scroll', 'resize'])('clears feedback on %s and suppresses completion at stale coordinates', async event => {
    const h = harness()
    h.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.visual()).toBeDefined()
    h.win.fire(event)
    expect(h.visual()).toBeUndefined()
    let finish
    mocks.copy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    h.click()
    h.win.fire(event)
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.visual()).toBeUndefined()
    expect(h.trigger.getAttribute('aria-label')).toBe('Copy color #3B82F680')
    h.popover.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not reopen an inspector dismissed by scrolling when a pending copy fails', async () => {
    let fail
    mocks.copy.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject }))
    const h = harness()
    h.open()
    h.click()
    h.win.fire('scroll')
    expect(h.panel()).toBeUndefined()
    fail(new Error('clipboard blocked'))
    await vi.advanceTimersByTimeAsync(0)
    expect(h.panel()).toBeUndefined()
    expect(h.visual()).toBeUndefined()
    expect(h.doc.root.querySelector('[role="status"]').textContent).toContain('Could not copy')
    h.popover.destroy()
  })

  it('keeps a near-edge click label inside the viewport and avoids a delayed hover inspector', async () => {
    const h = harness()
    h.trigger.getBoundingClientRect = () => ({ left: 620, top: 8, right: 636, bottom: 24 })
    h.article.fire('pointerover', { target: h.trigger })
    h.click({ clientX: 628, clientY: 16 })
    await vi.advanceTimersByTimeAsync(0)
    const label = h.visual().children[1]
    expect(label.style.left).toBe('558px')
    expect(label.style.top).toBe('8px')
    vi.advanceTimersByTime(120)
    expect(h.panel()).toBeDefined()
    const left = Number.parseFloat(label.style.left)
    const top = Number.parseFloat(label.style.top)
    const panel = h.panel().getBoundingClientRect()
    expect(left >= 8 && left + label.offsetWidth <= 632).toBe(true)
    expect(top + label.offsetHeight <= panel.top || left + label.offsetWidth <= panel.left || left >= panel.right || top >= panel.bottom).toBe(true)
    h.popover.destroy()
  })
})
