import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  globalUnbind: vi.fn(),
  splitDestroy: vi.fn(),
  editorDestroy: vi.fn(),
  renderDestroy: vi.fn(),
  documentSessionDestroy: vi.fn(),
  interactionsDestroy: vi.fn(),
  reactUnmount: vi.fn()
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
  createDocumentSessionController: () => ({
    destroy: mocks.documentSessionDestroy,
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

import { MarkdownViewerApp } from '../app.js'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { location: { href: 'file:///fixtures/navigation/index.md' } })
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
})
