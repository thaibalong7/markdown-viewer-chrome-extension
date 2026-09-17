import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  globalUnbind: vi.fn(),
  splitDestroy: vi.fn(),
  editorDestroy: vi.fn(),
  renderDestroy: vi.fn(),
  documentSessionDestroy: vi.fn(),
  documentSessionOpen: vi.fn(),
  interactionsDestroy: vi.fn(),
  reactUnmount: vi.fn(),
  mountOptions: null
}))

vi.mock('../../shared/logger.js', () => ({
  logger: { debug: vi.fn(), error: vi.fn() }
}))
vi.mock('../app/renderController.js', () => ({
  createRenderController: () => ({
    render: vi.fn(),
    syncTocItems: vi.fn(),
    destroy: mocks.renderDestroy,
    getLastSuccessfulRenderMarkdown: () => '',
    setSmoothInitialHashScroll: vi.fn()
  })
}))
vi.mock('../app/editorSessionController.js', () => ({
  createEditorSessionController: () => ({
    destroy: mocks.editorDestroy,
    isDirty: () => false,
    isEditModeActive: () => false
  })
}))
vi.mock('../app/documentSessionController.js', () => ({
  createDocumentSessionController: (options) => ({
    destroy: mocks.documentSessionDestroy,
    openDocument: async (href) => {
      const opened = await mocks.documentSessionOpen(href)
      if (opened) options.onCurrentDocumentChange?.({ href })
      return opened
    },
    getLoadedDocument: () => null,
    getUiState: () => ({ capabilities: { edit: true }, sourceKind: 'file-url' }),
    updateText: vi.fn()
  })
}))
vi.mock('../app/splitScrollSync.js', () => ({
  createSplitScrollSync: () => ({
    destroy: mocks.splitDestroy,
    bind: vi.fn(),
    unbind: vi.fn()
  })
}))
vi.mock('../app/globalViewerListeners.js', () => ({
  createGlobalViewerListeners: () => ({
    bind: vi.fn(),
    unbind: mocks.globalUnbind
  })
}))
vi.mock('../../messaging/index.js', () => ({
  MESSAGE_TYPES: { RECORD_FILE_OPENED: 'RECORD_FILE_OPENED' },
  sendMessage: vi.fn().mockResolvedValue({ ok: true })
}))
vi.mock('../article-interactions.js', () => ({
  createArticleInteractions: () => ({
    bind: vi.fn(),
    destroy: mocks.interactionsDestroy,
    scrollToHash: vi.fn(),
    closeImageLightbox: vi.fn()
  })
}))
vi.mock('../react/mount.js', () => ({
  mountViewerReact: (_container, options) => {
    mocks.mountOptions = options
    return {
      partsPromise: Promise.resolve({
        root: { style: { setProperty: vi.fn() } },
        article: { style: {}, closest: vi.fn(() => null), removeAttribute: vi.fn() }
      }),
      unmount: mocks.reactUnmount,
      updateSettings: vi.fn(),
      updateDocumentUiState: vi.fn(),
      bumpChrome: vi.fn(),
      showToast: vi.fn()
    }
  }
}))

import { MarkdownViewerApp } from '../app.js'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', {
    location: { href: 'file:///fixtures/navigation/index.md' },
    history: { pushState: vi.fn(), replaceState: vi.fn() }
  })
  vi.stubGlobal('document', { title: '' })
  vi.stubGlobal('sessionStorage', { getItem: vi.fn(() => null) })
  mocks.documentSessionOpen.mockResolvedValue(true)
  mocks.mountOptions = null
})

describe('MarkdownViewerApp cleanup characterization', () => {
  it('destroys each controller and clears the mount exactly once', () => {
    const container = { innerHTML: '<div>viewer</div>' }
    const app = new MarkdownViewerApp({
      markdown: '# Fixture',
      settings: {},
      container
    })
    app._articleInteractions = { destroy: mocks.interactionsDestroy }
    app._reactHandle = { unmount: mocks.reactUnmount }

    app.destroy()
    app.destroy()

    expect(mocks.globalUnbind).toHaveBeenCalledOnce()
    expect(mocks.splitDestroy).toHaveBeenCalledOnce()
    expect(mocks.editorDestroy).toHaveBeenCalledOnce()
    expect(mocks.documentSessionDestroy).toHaveBeenCalledOnce()
    expect(mocks.renderDestroy).toHaveBeenCalledOnce()
    expect(mocks.interactionsDestroy).toHaveBeenCalledOnce()
    expect(mocks.reactUnmount).toHaveBeenCalledOnce()
    expect(container.innerHTML).toBe('')
  })

  it('keeps workspace heading navigation out of the browser URL', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => (key === 'mdp:explorer:mode' ? 'workspace' : null))
    })
    const app = new MarkdownViewerApp({
      markdown: '# Fixture',
      settings: {},
      container: { innerHTML: '' }
    })
    app._currentFileUrl = 'file:///fixtures/navigation/docs/guide.md'

    expect(app._updateDocumentHeading('install')).toBe(
      'file:///fixtures/navigation/docs/guide.md#install'
    )
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  it('restores an f route before the viewer shell mounts', async () => {
    const app = new MarkdownViewerApp({
      markdown: '# Fixture',
      initialRoute: {
        entryFileUrl: 'file:///fixtures/navigation/index.md',
        targetFileUrl: 'file:///fixtures/navigation/docs/guide.md',
        hash: 'install',
        hasFileTarget: true,
        invalidFileTarget: false
      },
      settings: {},
      container: { innerHTML: '' }
    })

    await app._restoreInitialRoute()

    expect(mocks.documentSessionOpen).toHaveBeenCalledWith(
      'file:///fixtures/navigation/docs/guide.md'
    )
    expect(app._currentFileUrl).toBe('file:///fixtures/navigation/docs/guide.md')
    expect(document.title).toBe('guide - Markdown Plus')
  })

  it('ignores an f route when restoring a workspace session', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => (key === 'mdp:explorer:mode' ? 'workspace' : null))
    })
    const app = new MarkdownViewerApp({
      markdown: '# Fixture',
      initialRoute: {
        entryFileUrl: 'file:///fixtures/navigation/index.md',
        targetFileUrl: 'file:///fixtures/navigation/docs/guide.md',
        hash: 'install',
        hasFileTarget: true,
        invalidFileTarget: false
      },
      settings: {},
      container: { innerHTML: '' }
    })

    await app._restoreInitialRoute()

    expect(mocks.documentSessionOpen).not.toHaveBeenCalled()
    expect(app._currentFileUrl).toBe('file:///fixtures/navigation/index.md')
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      'file:///fixtures/navigation/index.md'
    )
  })

  it('wires the floating theme action to the viewer theme handler', async () => {
    const reactContainer = { className: '' }
    vi.stubGlobal('document', {
      title: '',
      createElement: vi.fn(() => reactContainer)
    })
    const container = { innerHTML: '', appendChild: vi.fn() }
    const app = new MarkdownViewerApp({
      markdown: '# Fixture',
      settings: { theme: { preset: 'light' } },
      container
    })
    app._toggleLightDarkTheme = vi.fn().mockResolvedValue(null)

    await app.init()
    await mocks.mountOptions.onThemeToggle()

    expect(app._toggleLightDarkTheme).toHaveBeenCalledOnce()
  })
})
