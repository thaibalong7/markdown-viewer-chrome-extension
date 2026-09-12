import { describe, expect, it, vi } from 'vitest'

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

describe('Markdown document renderer', () => {
  it('preserves the existing sanitized render and afterRender sequence', async () => {
    const afterRender = vi.fn().mockResolvedValue(undefined)
    const articleEl = {}
    const tocItems = [{ id: 'title' }]
    const services = {
      injectViewerStyles: vi.fn(),
      renderContextCache: new Map(),
      copyCodeWithToast: vi.fn(),
      prepareZoomableImages: vi.fn()
    }
    mocks.renderDocument.mockResolvedValue({ html: '<h1 id="title">Title</h1>', pluginManager: { afterRender } })
    mocks.buildTocItems.mockReturnValue(tocItems)

    const result = await render({
      loadedDocument: { text: '# Title' },
      articleEl,
      settings: { theme: { preset: 'light' } },
      services,
      signal: new AbortController().signal
    })

    expect(mocks.renderDocument).toHaveBeenCalledWith('# Title', expect.any(Object), {
      injectViewerStyles: services.injectViewerStyles,
      renderContextCache: services.renderContextCache
    })
    expect(mocks.renderIntoElement).toHaveBeenCalledWith(articleEl, '<h1 id="title">Title</h1>')
    expect(afterRender).toHaveBeenCalledWith(expect.objectContaining({ articleEl }))
    expect(services.prepareZoomableImages).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ tocItems, interactionProfile: 'markdown', renderedText: '# Title' })
  })
})
