import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGlobalViewerListeners } from '../globalViewerListeners.js'

class FakeEventTarget {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event)
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0
  }
}

class FakeDocument extends FakeEventTarget {}
class FakeHTMLElement extends FakeEventTarget {}
class FakeShadowRoot extends FakeEventTarget {}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('global viewer listeners', () => {
  it('unbinds all window and document listeners and remains safe to unbind again', () => {
    const fakeWindow = new FakeEventTarget()
    const fakeDocument = new FakeDocument()
    vi.stubGlobal('window', fakeWindow)
    vi.stubGlobal('document', fakeDocument)
    vi.stubGlobal('Document', FakeDocument)
    vi.stubGlobal('HTMLElement', FakeHTMLElement)
    vi.stubGlobal('ShadowRoot', FakeShadowRoot)
    const onSave = vi.fn()
    const listeners = createGlobalViewerListeners({
      container: new FakeHTMLElement(),
      isDestroyed: () => false,
      hasUnsavedChanges: () => true,
      canSave: () => true,
      onSave
    })

    listeners.bind()

    expect(fakeWindow.listenerCount('beforeunload')).toBe(1)
    expect(fakeDocument.listenerCount('keydown')).toBe(1)

    listeners.unbind()
    listeners.unbind()

    expect(fakeWindow.listenerCount('beforeunload')).toBe(0)
    expect(fakeDocument.listenerCount('keydown')).toBe(0)

    fakeDocument.dispatch('keydown', {
      key: 's',
      ctrlKey: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    })
    expect(onSave).not.toHaveBeenCalled()
  })
})
