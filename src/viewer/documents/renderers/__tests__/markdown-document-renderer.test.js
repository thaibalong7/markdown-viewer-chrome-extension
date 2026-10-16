// @vitest-environment jsdom
import { createArticle as createRealArticle, cleanDom } from '../../../react/content/__tests__/dom-test-helpers.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderDocument: vi.fn(),
  renderIntoElement: vi.fn(),
  buildTocItems: vi.fn(),
  prepareMarkdownImages: vi.fn()
}))
vi.mock('../../../core/renderer.js', () => ({
  renderDocument: mocks.renderDocument,
  renderIntoElement: mocks.renderIntoElement
}))
vi.mock('../../../core/toc-builder.js', () => ({ buildTocItems: mocks.buildTocItems }))
vi.mock('../../markdown-images.js', () => ({ prepareMarkdownImages: mocks.prepareMarkdownImages }))

import { render } from '../markdown-document-renderer.js'

afterEach(cleanDom)

function createArticle() { return createRealArticle() }

describe('Markdown document renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prepareMarkdownImages.mockReturnValue(vi.fn())
  })

  it('prepares sanitized article images and releases them with plugin resources', async () => {
    const imageCleanup = vi.fn()
    const pluginCleanup = vi.fn()
    mocks.prepareMarkdownImages.mockReturnValue(imageCleanup)
    mocks.renderDocument.mockResolvedValue({
      html: '<img src="./diagram.svg" alt="Diagram">',
      pluginManager: { afterRender: vi.fn().mockResolvedValue(pluginCleanup) }
    })
    const articleEl = {}
    const signal = new AbortController().signal
    const result = await render({
      loadedDocument: { document: { href: 'file:///docs/current.md' }, text: '![Diagram](./diagram.svg)' },
      articleEl, settings: {}, services: {}, signal
    })

    expect(mocks.prepareMarkdownImages).toHaveBeenCalledWith({
      articleEl, documentHref: 'file:///docs/current.md', signal
    })
    expect(mocks.renderIntoElement.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.prepareMarkdownImages.mock.invocationCallOrder[0]
    )
    result.cleanup()
    expect(imageCleanup).toHaveBeenCalledOnce()
    expect(pluginCleanup).toHaveBeenCalledOnce()
  })

  it('releases prepared image resources if an afterRender hook fails', async () => {
    const imageCleanup = vi.fn()
    mocks.prepareMarkdownImages.mockReturnValue(imageCleanup)
    mocks.renderDocument.mockResolvedValue({
      html: '<p>Document</p>',
      pluginManager: { afterRender: vi.fn().mockRejectedValue(new Error('Hook failed')) }
    })
    await expect(render({
      loadedDocument: { text: 'Document' }, articleEl: {}, settings: {}, services: {}
    })).rejects.toThrow('Hook failed')
    expect(imageCleanup).toHaveBeenCalledOnce()
  })

  it('preserves the existing sanitized render and afterRender sequence', async () => {
    const afterRender = vi.fn().mockResolvedValue(undefined)
    const articleEl = {}
    const tocItems = [{ id: 'title' }]
    const services = {
      injectViewerStyles: vi.fn(),
      renderContextCache: new Map(),
      copyCodeWithToast: vi.fn(),
      prepareZoomableImages: vi.fn(),
      showToast: vi.fn()
    }
    mocks.renderDocument.mockResolvedValue({ html: '<h1 id="title">Title</h1>', pluginManager: { afterRender } })
    mocks.buildTocItems.mockReturnValue(tocItems)

    const result = await render({
      loadedDocument: { text: '# Title' },
      articleEl,
      settings: { theme: { activeId: 'light', customThemes: [] } },
      services,
      signal: new AbortController().signal
    })

    expect(mocks.renderDocument).toHaveBeenCalledWith(
      '# Title',
      expect.any(Object),
      expect.objectContaining({
        injectViewerStyles: services.injectViewerStyles,
        renderContextCache: services.renderContextCache,
        onPluginWarning: expect.any(Function)
      })
    )
    expect(mocks.renderIntoElement).toHaveBeenCalledWith(articleEl, '<h1 id="title">Title</h1>')
    expect(afterRender).toHaveBeenCalledWith(expect.objectContaining({ articleEl }))
    expect(services.prepareZoomableImages).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ tocItems, interactionProfile: 'markdown', renderedText: '# Title' })
  })

  it('preserves literal document text that happens to match an interface message key', async () => {
    const source = 'viewer.useexplorer.selectASupportedFileFromTheFilesPanel'
    const articleEl = createArticle()
    mocks.renderDocument.mockResolvedValue({ html: `<p>${source}</p>` })

    const result = await render({
      loadedDocument: { text: source }, articleEl, settings: {}, services: {}
    })

    expect(mocks.renderDocument).toHaveBeenCalledWith(source, {}, expect.any(Object))
    expect(mocks.renderIntoElement).toHaveBeenCalledWith(articleEl, `<p>${source}</p>`)
    expect(result.renderedText).toBe(source)
  })

  it('surfaces one warning toast while continuing after plugin hook failures', async () => {
    const afterRender = vi.fn(async ({ onPluginWarning }) => {
      onPluginWarning({ pluginId: 'first', hook: 'afterRender' })
      onPluginWarning({ pluginId: 'second', hook: 'afterRender' })
    })
    const services = {
      injectViewerStyles: vi.fn(),
      renderContextCache: new Map(),
      copyCodeWithToast: vi.fn(),
      prepareZoomableImages: vi.fn(),
      showToast: vi.fn()
    }
    mocks.renderDocument.mockResolvedValue({
      html: '<p>Basic Markdown</p>',
      pluginManager: { afterRender },
      warnings: []
    })
    mocks.buildTocItems.mockReturnValue([])

    const result = await render({
      loadedDocument: { text: 'Basic Markdown' },
      articleEl: {},
      settings: {},
      services,
      signal: new AbortController().signal
    })

    expect(mocks.renderIntoElement).toHaveBeenCalledWith({}, '<p>Basic Markdown</p>')
    expect(services.showToast).toHaveBeenCalledOnce()
    expect(services.showToast).toHaveBeenCalledWith(
      'viewer.documents.markdown.someMarkdownEnhancementsCouldNotBeAppliedBasic',
      { variant: 'warning' }
    )
    expect(result.renderResult.warnings).toEqual([
      { pluginId: 'first', hook: 'afterRender' },
      { pluginId: 'second', hook: 'afterRender' }
    ])
  })

  it.each(['', ' \n\t'])('renders an accessible empty state with an edit hint for %j', async (source) => {
    const articleEl = createArticle()

    const result = await render({
      loadedDocument: { document: { sourceKind: 'file-url' }, text: source },
      articleEl,
      settings: { editor: { enabled: true } },
      services: {},
      signal: new AbortController().signal
    })

    expect(mocks.renderDocument).not.toHaveBeenCalled()
    expect(articleEl.children[0]).toMatchObject({
      tagName: 'SECTION',
      className: 'mdp-ui-state mdp-document-empty',
      role: 'status'
    })
    expect([...articleEl.children[0].children]).toEqual([
      expect.objectContaining({ textContent: 'Empty Markdown document' }),
      expect.objectContaining({ textContent: 'Use Edit to start writing.' })
    ])
    expect(result).toMatchObject({
      tocItems: [],
      interactionProfile: 'markdown',
      renderedText: source
    })
  })

  it.each([
    ['workspace Markdown', 'workspace-file', true],
    ['local Markdown while the editor is disabled', 'file-url', false]
  ])('omits the edit hint for %s', async (_label, sourceKind, editorEnabled) => {
    const articleEl = createArticle()

    await render({
      loadedDocument: { document: { sourceKind }, text: '' },
      articleEl,
      settings: { editor: { enabled: editorEnabled } },
      services: {},
      signal: new AbortController().signal
    })

    expect([...articleEl.children[0].children]).toEqual([
      expect.objectContaining({ textContent: 'Empty Markdown document' })
    ])
  })
})
