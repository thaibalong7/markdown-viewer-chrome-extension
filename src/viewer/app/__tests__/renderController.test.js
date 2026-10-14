// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { renderer } = vi.hoisted(() => ({ renderer: { render: vi.fn() } }))
vi.mock('../../documents/renderer-registry.js', () => ({
  getDocumentRenderer: vi.fn().mockResolvedValue(renderer)
}))
vi.mock('../../../shared/logger.js', () => ({
  logger: { error: vi.fn() }
}))

import { createArticle, cleanDom, fire } from '../../react/content/__tests__/dom-test-helpers.js'
afterEach(cleanDom)

import { createRenderController } from '../renderController.js'

function createHarness() {
  const article = createArticle()
  article.setAttribute = vi.fn(article.setAttribute)
  article.removeAttribute = vi.fn(article.removeAttribute)
  const reactHandle = {
    setTocReady: vi.fn(),
    updateChromeState: vi.fn(),
    showToast: vi.fn()
  }
  const loadedDocument = {
    document: { fileTypeId: 'markdown' },
    text: '# Current'
  }
  const onBusyChange = vi.fn()
  const controller = createRenderController({
    getLoadedDocument: () => loadedDocument,
    getSettings: () => ({ layout: { showToc: true } }),
    getArticleEl: () => article,
    getArticleInteractions: () => null,
    getReactHandle: () => reactHandle,
    getScrollRoot: () => null,
    onBusyChange,
    container: { appendChild: vi.fn() }
  })
  return { article, reactHandle, loadedDocument, onBusyChange, controller }
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

  it('exposes the viewer toast bridge to document renderers', async () => {
    renderer.render.mockImplementationOnce(({ services }) => {
      services.showToast('Plugin fallback active', { variant: 'warning' })
      return { tocItems: [], renderedText: '# Current' }
    })
    const { controller, reactHandle } = createHarness()

    await controller.render()

    expect(reactHandle.showToast).toHaveBeenCalledWith('Plugin fallback active', {
      variant: 'warning'
    })
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

  it('does not replace a newer document with an older renderer failure', async () => {
    let fail
    renderer.render
      .mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject }))
      .mockImplementationOnce(({ articleEl }) => {
        articleEl.textContent = 'New document'
        return { tocItems: [], renderedText: '# New' }
      })
    const { controller, article } = createHarness()
    const first = controller.render()
    await Promise.resolve()
    await controller.render()
    fail(new Error('Stale render failure'))
    await first
    expect(article.textContent).toBe('New document')
    expect(article.querySelector('[role="alert"]')).toBeNull()
    controller.destroy()
  })

  it('publishes busy state through rendering and mounts a recoverable visible error', async () => {
    renderer.render
      .mockRejectedValueOnce(new Error('renderer failed'))
      .mockResolvedValueOnce({ tocItems: [], renderedText: '# Recovered' })
    const { article, controller, onBusyChange } = createHarness()

    await expect(controller.render()).resolves.toBeNull()
    expect(onBusyChange.mock.calls.map(([value]) => value)).toEqual([true, false])
    expect(article.children[0]).toMatchObject({
      className: expect.stringContaining('mdp-ui-state--error'),
      role: 'alert'
    })
    expect(article.children[0].children[0].textContent).toBe('Document could not be rendered')

    fire(article.children[0].children[2], 'click')
    await vi.waitFor(() => expect(renderer.render).toHaveBeenCalledTimes(2))
  })

  it('shows the initial skeleton only after the delay and clears its accessible label', async () => {
    vi.useFakeTimers()
    let resolveRender
    renderer.render.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRender = resolve
    }))
    const { article, controller } = createHarness()

    try {
      const renderPromise = controller.render()
      await Promise.resolve()
      await Promise.resolve()
      expect(article.children).toHaveLength(0)

      await vi.advanceTimersByTimeAsync(180)
      expect(article.children[0]).toMatchObject({
        className: 'mdp-skeleton mdp-document-skeleton',
        ariaHidden: 'true'
      })
      expect(article.getAttribute('aria-label')).toBe('Loading document')

      resolveRender({ tocItems: [], renderedText: '# Loaded' })
      await renderPromise
      expect(article.getAttribute('aria-label')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})


it('keeps the outline ready throughout an in-place refresh', async () => {
  renderer.render.mockResolvedValueOnce({ tocItems: [], renderedText: '# Updated' })
  const { controller, reactHandle } = createHarness()
  await controller.render({ preserveScroll: true, honorHash: false })
  expect(reactHandle.setTocReady).not.toHaveBeenCalledWith(false)
  expect(reactHandle.setTocReady).toHaveBeenCalledWith(true)
  controller.destroy()
})
