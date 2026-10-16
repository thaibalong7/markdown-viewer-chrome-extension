// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReadingPositionController } from '../readingPositionController.js'

const ENTRY = 'file:///docs/index.md'
const OTHER = 'file:///docs/notes.txt'

function harness({ storage = sessionStorage, workspaceRoot, ...options } = {}) {
  let current = { href: ENTRY }
  const root = { scrollTop: 250, scrollHeight: 2000, clientHeight: 500 }
  const restorePosition = vi.fn(() => true)
  const onScopeChange = vi.fn()
  const events = new EventTarget()
  events.history = { scrollRestoration: 'auto' }
  const controller = createReadingPositionController({
    entryFileUrl: ENTRY, workspaceRoot,
    getCurrentDocument: () => current, getScrollRoot: () => root,
    getArticleEl: () => ({ querySelectorAll: () => [] }),
    restorePosition, onScopeChange, getStorage: () => storage,
    eventTarget: events, ...options
  })
  const show = (href = ENTRY, state = {}) => {
    current = { href }
    controller.documentRendered({ document: current, ...state })
  }
  show()
  return { controller, root, show, restorePosition, onScopeChange, events }
}

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks() })

describe('reading position session', () => {
  it('keeps data-only bookmarks and updates each file independently', () => {
    const h = harness()
    h.controller.beforeDocumentReplace()
    h.show(OTHER)
    h.root.scrollTop = 700
    h.controller.beforeDocumentReplace()
    h.show()
    expect(h.controller.restore(ENTRY)).toBe(true)
    expect(h.restorePosition).toHaveBeenLastCalledWith({
      top: 250, ratio: 1 / 6, headingId: null, headingText: '', headingIndex: -1, offset: 0
    })
    h.show(OTHER)
    h.controller.restore(OTHER)
    expect(h.restorePosition).toHaveBeenLastCalledWith(expect.objectContaining({ top: 700 }))
    expect(sessionStorage.getItem('mdp:readingPositions')).not.toContain('scrollRoot')
    h.controller.destroy()
  })

  it('skips duplicate writes but persists a changed position or active file', () => {
    const data = new Map()
    const storage = {
      getItem: (key) => data.get(key) || null,
      setItem: vi.fn((key, value) => data.set(key, value)),
      removeItem: (key) => data.delete(key)
    }
    const h = harness({ storage })
    h.controller.saveCurrent()
    h.controller.saveCurrent()
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    h.root.scrollTop = 500
    h.controller.saveCurrent()
    expect(storage.setItem).toHaveBeenCalledTimes(2)
    h.show(OTHER)
    h.controller.saveCurrent()
    expect(storage.setItem).toHaveBeenCalledTimes(3)
    h.show()
    h.controller.saveCurrent()
    expect(storage.setItem).toHaveBeenCalledTimes(4)
    h.controller.destroy()
    expect(storage.setItem).toHaveBeenCalledTimes(4)
  })

  it('saves before reload and restores only the matching entry and workspace', () => {
    const h = harness({ workspaceRoot: 'file:///docs/' })
    h.show(OTHER)
    h.events.dispatchEvent(new Event('beforeunload'))
    const reloaded = harness({ workspaceRoot: 'file:///docs/' })
    expect(reloaded.controller.getReloadHref()).toBe(OTHER)
    reloaded.show(OTHER)
    expect(reloaded.controller.restore(OTHER)).toBe(true)
    const different = harness({ workspaceRoot: 'file:///another/' })
    expect(different.controller.restore(ENTRY)).toBe(false)
    h.controller.destroy(); reloaded.controller.destroy(); different.controller.destroy()
  })

  it('resets on workspace switch and leave, without resaving the outgoing document', () => {
    const h = harness()
    h.controller.saveCurrent()
    h.controller.startWorkspace('file:///workspace/')
    h.controller.beforeDocumentReplace()
    h.show()
    expect(h.controller.restore(ENTRY)).toBe(false)
    h.controller.saveCurrent()
    h.controller.startWorkspace('file:///workspace/')
    expect(h.onScopeChange).toHaveBeenCalledTimes(1)
    expect(h.controller.restore(ENTRY)).toBe(true)
    h.controller.leaveWorkspace()
    h.controller.beforeDocumentReplace()
    h.show()
    expect(h.controller.restore(ENTRY)).toBe(false)
    h.controller.startWorkspace('file:///workspace/')
    h.show()
    expect(h.controller.restore(ENTRY)).toBe(false)
    h.controller.destroy()
  })

  it('isolates identically named virtual workspace files and never persists them', () => {
    const h = harness()
    const href = 'mdp-ws-file:Project%2Freadme.md'
    h.controller.startWorkspace(null)
    h.show(href)
    h.controller.saveCurrent()
    expect(h.controller.restore(href)).toBe(true)
    expect(sessionStorage.getItem('mdp:readingPositions')).toBeNull()
    h.controller.startWorkspace(null)
    h.show(href)
    expect(h.controller.restore(href)).toBe(false)
    h.controller.destroy()
  })

  it('keeps the in-memory feature when storage is unavailable', () => {
    const h = harness({ getStorage: () => { throw new DOMException('Denied', 'SecurityError') } })
    h.controller.saveCurrent()
    expect(h.controller.restore(ENTRY)).toBe(true)
    h.controller.destroy()
  })

  it('clears persisted bookmarks on scope change even after a storage write fails', () => {
    const data = new Map()
    const storage = {
      getItem: (key) => data.get(key) || null,
      setItem: vi.fn((key, value) => data.set(key, value)),
      removeItem: (key) => data.delete(key)
    }
    const h = harness({ storage })
    h.controller.saveCurrent()
    storage.setItem.mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    h.root.scrollTop = 500
    h.controller.saveCurrent()
    h.controller.startWorkspace('file:///another/')
    const reload = harness({ storage })
    expect(reload.controller.restore(ENTRY)).toBe(false)
    h.controller.destroy()
    reload.controller.destroy()
  })

  it('does not replace bookmarks with placeholder or load-error scroll positions', () => {
    const h = harness()
    h.controller.saveCurrent()
    h.show(ENTRY, { loadError: { code: 'failed' } })
    h.root.scrollTop = 0
    h.controller.saveCurrent()
    h.show()
    h.controller.restore(ENTRY)
    expect(h.restorePosition).toHaveBeenLastCalledWith(expect.objectContaining({ top: 250 }))
    h.show(ENTRY, { placeholderMessage: 'Pick a file' })
    expect(h.controller.restore(ENTRY)).toBe(false)
    h.controller.destroy()
  })

  it('uses current article scroll on pagehide and removes listeners on destruction', () => {
    const h = harness()
    expect(h.events.history.scrollRestoration).toBe('manual')
    h.root.scrollTop = 400
    h.events.dispatchEvent(new Event('pagehide'))
    h.controller.restore(ENTRY)
    expect(h.restorePosition).toHaveBeenLastCalledWith(expect.objectContaining({ top: 400 }))
    h.controller.destroy()
    expect(h.events.history.scrollRestoration).toBe('auto')
    const saved = sessionStorage.getItem('mdp:readingPositions')
    h.root.scrollTop = 900
    h.events.dispatchEvent(new Event('pagehide'))
    expect(sessionStorage.getItem('mdp:readingPositions')).toBe(saved)
  })
})
