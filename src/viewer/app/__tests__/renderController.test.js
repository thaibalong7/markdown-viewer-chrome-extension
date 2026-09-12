import { beforeEach, describe, expect, it, vi } from 'vitest'

const { renderer } = vi.hoisted(() => ({ renderer: { render: vi.fn() } }))
vi.mock('../../documents/renderer-registry.js', () => ({
  getDocumentRenderer: vi.fn().mockResolvedValue(renderer)
}))
vi.mock('../../../shared/logger.js', () => ({
  logger: { error: vi.fn() }
}))

import { createRenderController } from '../renderController.js'

function createHarness() {
  const article = {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn()
  }
  const reactHandle = {
    setTocReady: vi.fn(),
    updateChromeState: vi.fn()
  }
  const loadedDocument = {
    document: { fileTypeId: 'markdown' },
    text: '# Current'
  }
  const controller = createRenderController({
    getLoadedDocument: () => loadedDocument,
    getSettings: () => ({ layout: { showToc: true } }),
    getArticleEl: () => article,
    getArticleInteractions: () => null,
    getReactHandle: () => reactHandle,
    getScrollRoot: () => null,
    container: { appendChild: vi.fn() }
  })
  return { article, reactHandle, loadedDocument, controller }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('document render controller', () => {
  it('publishes renderer-provided outline items and cleans up between renders', async () => {
    const firstCleanup = vi.fn()
    const secondCleanup = vi.fn()
    const tocItems = [{ id: 'title', level: 1, text: 'Title', el: {} }]
    renderer.render
      .mockResolvedValueOnce({ tocItems, renderedText: '# First', cleanup: firstCleanup })
      .mockResolvedValueOnce({ tocItems: [], renderedText: '# Second', cleanup: secondCleanup })
    const { controller, reactHandle } = createHarness()

    await controller.render()
    expect(reactHandle.updateChromeState).toHaveBeenLastCalledWith({ tocItems })
    await controller.render()
    expect(firstCleanup).toHaveBeenCalledOnce()

    controller.destroy()
    controller.destroy()
    expect(secondCleanup).toHaveBeenCalledOnce()
  })

  it('aborts an older render before starting a newer one', async () => {
    let resolveFirst
    const firstResult = new Promise((resolve) => { resolveFirst = resolve })
    renderer.render
      .mockImplementationOnce(({ signal }) => firstResult.then(() => {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError')
        return { tocItems: [], renderedText: '# First' }
      }))
      .mockResolvedValueOnce({ tocItems: [], renderedText: '# Second' })
    const { controller } = createHarness()

    const firstRender = controller.render()
    await Promise.resolve()
    const secondRender = controller.render()
    await secondRender
    resolveFirst()
    await expect(firstRender).resolves.toBeNull()
    expect(controller.getLastSuccessfulRenderMarkdown()).toBe('# Second')
  })
})
