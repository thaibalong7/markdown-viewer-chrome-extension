// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocumentIdentity } from '../../documents/document-model.js'
import { createExplorerNavigator, createSiblingBackNavigationForUrl } from '../../explorer/explorer-navigation.js'
import { createDocumentSessionController } from '../documentSessionController.js'
import { createReadingPositionController } from '../readingPositionController.js'
import { createRenderController } from '../renderController.js'

const { renderer } = vi.hoisted(() => ({ renderer: { render: vi.fn() } }))
vi.mock('../../documents/renderer-registry.js', () => ({ getDocumentRenderer: async () => renderer }))

const ENTRY = 'file:///docs/index.md'
const OTHER = 'file:///docs/notes.md'
const cleanups = []

function harness({ loadDocument = async () => ({ text: '# Section' }), beforeDocumentSwitch = () => true } = {}) {
  const root = document.createElement('main')
  const article = document.createElement('article')
  root.append(article)
  document.body.append(root)
  Object.defineProperties(root, {
    scrollHeight: { configurable: true, value: 2400 },
    clientHeight: { value: 400 }
  })
  root.getBoundingClientRect = () => ({ top: 0 })
  root.scrollTo = vi.fn(({ top }) => { root.scrollTop = top })
  let session
  let renderController
  const reading = createReadingPositionController({
    entryFileUrl: ENTRY, getCurrentDocument: () => session.getCurrentDocument(),
    getScrollRoot: () => root, getArticleEl: () => article,
    restorePosition: (data) => renderController.restoreSavedPosition(data),
    cancelRestoration: () => renderController.cancelReadingRestoration(),
    onScopeChange: () => { session.cancelPendingNavigation(); renderController.cancelPendingRender() }
  })
  renderController = createRenderController({
    getLoadedDocument: () => session.getLoadedDocument(), getSettings: () => ({}),
    getArticleEl: () => article, getArticleInteractions: () => null,
    getReactHandle: () => null, getScrollRoot: () => root, container: root,
    onRenderStart: reading.beforeRender,
    onDocumentRendered: reading.documentRendered
  })
  session = createDocumentSessionController({
    initialDocument: createDocumentIdentity(ENTRY), initialText: '# Section',
    loadDocument, beforeDocumentSwitch, render: renderController.render,
    onBeforeDocumentReplace: reading.beforeDocumentReplace
  })
  const refs = {
    currentFileUrlRef: { current: ENTRY }, explorerModeRef: { current: 'sibling' },
    siblingTreeRef: { current: null }, siblingScanRootUrlRef: { current: null },
    workspaceTreeRef: { current: null }, workspaceVirtualReadersRef: { current: new Map() }
  }
  const safePatch = vi.fn()
  const navigator = createExplorerNavigator({
    bridge: {
      openDocument: session.openDocument, readingPositions: reading,
      getArticleEl: () => article, getScrollRoot: () => root, getEntryFileUrl: () => ENTRY
    }, refs, stateRef: { current: { expandedMap: {} } },
    setCurrentFileUrl: (href) => { refs.currentFileUrlRef.current = href },
    safePatch, buildFilesContext: () => null, runSiblingScan: vi.fn(), syncExplorerBackButton: vi.fn()
  })
  cleanups.push(() => { reading.destroy(); session.destroy(); renderController.destroy(); root.remove() })
  return { root, article, reading, renderController, navigator, refs, session, safePatch }
}

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem('mdp:explorer:originalFile', ENTRY)
  renderer.render.mockReset().mockImplementation(async ({ articleEl }) => {
    articleEl.innerHTML = '<h1 id="section">Section</h1><p>Content</p>'
    const heading = articleEl.firstElementChild
    heading.getBoundingClientRect = () => ({ top: 200 - articleEl.parentElement.scrollTop })
    return { tocItems: [], renderedText: '# Section' }
  })
})
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('file navigation reading positions', () => {
  it('honors forceReload and syncExplorer for virtual workspace documents', async () => {
    const loadDocument = vi.fn(async () => ({ text: '# Virtual' }))
    const h = harness({ loadDocument })
    h.reading.startWorkspace(null)
    h.refs.explorerModeRef.current = 'workspace'
    const href = 'mdp-ws-file:Project%2Fa.md'
    h.refs.workspaceVirtualReadersRef.current.set(href, {})
    await h.navigator.navigateToFile(href, { syncExplorer: false })
    expect(h.safePatch).not.toHaveBeenCalled()
    h.root.scrollTop = 450
    await h.navigator.navigateToFile(href, { forceReload: true, syncExplorer: false })
    expect(loadDocument).toHaveBeenCalledTimes(2)
    expect(h.root.scrollTop).toBe(450)
    expect(h.safePatch).not.toHaveBeenCalled()
  })
  it('restores A through Back and retains the last position of B', async () => {
    const h = harness()
    await h.renderController.render()
    h.root.scrollTop = 350
    await h.navigator.navigateToFile(OTHER)
    expect(h.root.scrollTop).toBe(0)
    h.root.scrollTop = 750
    const back = createSiblingBackNavigationForUrl(OTHER, h.navigator.navigateToFile)
    back.onBack()
    await vi.waitFor(() => expect(h.root.scrollTop).toBe(350))
    await h.navigator.navigateToFile(OTHER)
    expect(h.root.scrollTop).toBe(750)
    await h.navigator.navigateToFile(OTHER)
    expect(h.root.scrollTop).toBe(750)
  })

  it('prioritizes explicit headings and does not restore after user scrolls', async () => {
    const resizeCallbacks = []
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback) { resizeCallbacks.push(callback) }
      observe() {}
      disconnect() {}
    })
    const h = harness()
    await h.renderController.render()
    h.root.scrollTop = 350
    await h.navigator.navigateToFile(OTHER)
    await h.navigator.navigateToFile(ENTRY, { hash: 'section' })
    expect(h.root.scrollTop).not.toBe(350)
    await h.navigator.navigateToFile(OTHER)
    await h.navigator.navigateToFile(ENTRY)
    const lateResize = resizeCallbacks.at(-1)
    h.root.dispatchEvent(new Event('wheel', { bubbles: true }))
    h.root.scrollTop = 900
    // A late resize must not pull the reader back to the bookmark.
    lateResize()
    expect(h.root.scrollTop).toBe(900)
  })

  it('leaves the position untouched when dirty-state confirmation rejects navigation', async () => {
    const h = harness({ beforeDocumentSwitch: () => false })
    await h.renderController.render()
    h.root.scrollTop = 350
    expect(await h.navigator.navigateToFile(OTHER)).toBe(false)
    expect(h.root.scrollTop).toBe(350)
    expect(h.reading.restore(ENTRY)).toBe(false)
  })

  it('cannot restore or save a late document after switching workspace', async () => {
    let resolveLoad
    const h = harness({ loadDocument: () => new Promise((resolve) => { resolveLoad = resolve }) })
    await h.renderController.render()
    h.root.scrollTop = 350
    const navigating = h.navigator.navigateToFile(OTHER)
    await Promise.resolve()
    h.reading.startWorkspace('file:///another/')
    resolveLoad({ text: '# Late' })
    expect(await navigating).toBe(false)
    expect(h.session.getCurrentDocument().href).toBe(ENTRY)
    expect(h.reading.restore(ENTRY)).toBe(false)
    expect(h.reading.restore(OTHER)).toBe(false)
  })

  it('shares restoration with virtual workspace navigation', async () => {
    const h = harness()
    h.reading.startWorkspace(null)
    h.refs.explorerModeRef.current = 'workspace'
    const a = 'mdp-ws-file:Project%2Fa.md'
    const b = 'mdp-ws-file:Project%2Fb.md'
    h.refs.workspaceVirtualReadersRef.current = new Map([[a, {}], [b, {}]])
    await h.navigator.navigateToFile(a)
    h.root.scrollTop = 450
    await h.navigator.navigateToFile(b)
    h.root.scrollTop = 850
    await h.navigator.navigateToFile(a)
    expect(h.root.scrollTop).toBe(450)
    await h.navigator.navigateToFile(a)
    expect(h.root.scrollTop).toBe(450)
  })

  it('invalidates render completion when a workspace changes during rendering', async () => {
    const h = harness()
    await h.renderController.render()
    h.root.scrollTop = 350
    let finishRender
    renderer.render.mockImplementationOnce(() => new Promise((resolve) => { finishRender = resolve }))
    const navigating = h.navigator.navigateToFile(OTHER)
    await vi.waitFor(() => expect(finishRender).toBeTypeOf('function'))
    h.reading.startWorkspace('file:///another/')
    finishRender({ tocItems: [], renderedText: '# Late' })
    expect(await navigating).toBe(false)
    expect(h.reading.restore(OTHER)).toBe(false)
    h.reading.saveCurrent()
    expect(h.reading.getReloadHref()).toBeNull()
  })

  it('does not resume capturing a partially rendered retained document after a scope change', async () => {
    const h = harness()
    await h.renderController.render()
    h.root.scrollTop = 350
    let finishRender
    renderer.render.mockImplementationOnce(() => {
      h.root.scrollTop = 0
      return new Promise((resolve) => { finishRender = resolve })
    })
    const rendering = h.renderController.render({ preserveScroll: true, honorHash: false })
    await vi.waitFor(() => expect(finishRender).toBeTypeOf('function'))
    h.reading.startWorkspace('file:///another/')
    h.reading.resume()
    h.reading.saveCurrent()
    expect(h.reading.getReloadHref()).toBeNull()
    finishRender({ tocItems: [], renderedText: '# Partial' })
    await rendering
  })
})
