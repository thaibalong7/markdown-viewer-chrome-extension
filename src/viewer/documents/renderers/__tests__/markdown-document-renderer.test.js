import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderDocument: vi.fn(),
  renderIntoElement: vi.fn(),
  buildTocItems: vi.fn()
}))
vi.mock('../../../core/renderer.js', () => ({
  renderDocument: mocks.renderDocument,
  renderIntoElement: mocks.renderIntoElement
}))
vi.mock('../../../core/toc-builder.js', () => ({ buildTocItems: mocks.buildTocItems }))

import { render } from '../markdown-document-renderer.js'

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    children: [],
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    append(...children) {
      this.children.push(...children)
    }
  }
}

function createArticle() {
  const ownerDocument = { createElement }
  return {
    ownerDocument,
    children: [],
    replaceChildren(...children) {
      this.children = children
    }
  }
}

describe('Markdown document renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      'Some Markdown enhancements could not be applied. Basic Markdown is still available.',
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
      attributes: { role: 'status' }
    })
    expect(articleEl.children[0].children).toEqual([
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

    expect(articleEl.children[0].children).toEqual([
      expect.objectContaining({ textContent: 'Empty Markdown document' })
    ])
  })
})
