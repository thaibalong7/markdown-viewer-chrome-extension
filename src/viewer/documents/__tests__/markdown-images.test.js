import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ readLocalTextResource: vi.fn(), warn: vi.fn() }))
vi.mock('../document-loader.js', () => ({ readLocalTextResource: mocks.readLocalTextResource }))
vi.mock('../../../shared/logger.js', () => ({ logger: { warn: mocks.warn } }))

import { prepareMarkdownImages } from '../markdown-images.js'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'

function createArticle(sources) {
  const images = sources.map((src) => {
    const attributes = new Map([['src', src]])
    return {
      getAttribute: (name) => attributes.get(name),
      setAttribute: (name, value) => attributes.set(name, value)
    }
  })
  return { images, querySelectorAll: () => images }
}

function prepare(articleEl, signal) {
  return prepareMarkdownImages({
    articleEl, documentHref: 'file:///docs/guides/current.md', signal
  })
}

describe('Markdown image resources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg-image')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    mocks.readLocalTextResource.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"/>')
  })

  afterEach(() => vi.restoreAllMocks())

  it('resolves SVGs against the active document and preserves raster image behavior', async () => {
    const article = createArticle(['../images/photo.png', './diagram.svg'])
    const cleanup = prepare(article)

    expect(article.images[0].getAttribute('src')).toBe('../images/photo.png')
    await vi.waitFor(() => expect(article.images[1].getAttribute('src')).toBe('blob:svg-image'))
    expect(article.images[1].getAttribute('data-mdp-file-type')).toBe('svg-image')
    expect(mocks.readLocalTextResource).toHaveBeenCalledExactlyOnceWith(
      'file:///docs/guides/diagram.svg', { signal: undefined }
    )
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('image/svg+xml')
    expect(await blob.text()).toContain('<svg')
    cleanup()
    cleanup()
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:svg-image')
  })

  it('shares repeated SVG reads and preserves view fragments and encoded filenames', async () => {
    const article = createArticle(['../My%20Diagram.SVG?v=1#first', '../My%20Diagram.SVG#second'])
    const cleanup = prepare(article)
    await vi.waitFor(() => expect(article.images[0].getAttribute('src')).toBe('blob:svg-image#first'))

    expect(mocks.readLocalTextResource).toHaveBeenCalledExactlyOnceWith(
      'file:///docs/My%20Diagram.SVG', { signal: undefined }
    )
    expect(article.images.map((image) => image.getAttribute('src'))).toEqual([
      'blob:svg-image#first', 'blob:svg-image#second'
    ])
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    cleanup()
  })

  it('leaves remote, data and blob images on their existing browser paths', () => {
    const sources = [
      'https://example.com/diagram.svg', '//example.com/diagram.svg',
      'data:image/svg+xml,%3Csvg/%3E', 'blob:existing-image'
    ]
    const article = createArticle(sources)
    const cleanup = prepare(article)

    expect(article.images.map((image) => image.getAttribute('src'))).toEqual(sources)
    expect(mocks.readLocalTextResource).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    cleanup()
  })

  it('retains the resolved SVG image fallback on read failure without failing Markdown', async () => {
    mocks.readLocalTextResource.mockRejectedValue(new Error('Read failed'))
    const article = createArticle(['./missing.svg'])
    const cleanup = prepare(article)
    await vi.waitFor(() => expect(mocks.warn).toHaveBeenCalled())

    expect(article.images[0].getAttribute('src')).toBe('file:///docs/guides/missing.svg')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    cleanup()
  })

  it('does not update a stale image or allocate a URL when cancelled during a read', async () => {
    let resolveRead
    mocks.readLocalTextResource.mockImplementation(() => new Promise((resolve) => { resolveRead = resolve }))
    const controller = new AbortController()
    const article = createArticle(['./diagram.svg'])
    const cleanup = prepare(article, controller.signal)
    // Preparation must return before the local read finishes, so Markdown can render.
    expect(cleanup).toBeTypeOf('function')
    controller.abort()
    resolveRead('<svg/>')
    await mocks.readLocalTextResource.mock.results[0].value

    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(article.images[0].getAttribute('src')).toBe('file:///docs/guides/diagram.svg')
    cleanup()
  })

  it('revokes resources on abort after preparation', async () => {
    const controller = new AbortController()
    const article = createArticle(['./diagram.svg'])
    const cleanup = prepare(article, controller.signal)
    await vi.waitFor(() => expect(article.images[0].getAttribute('src')).toBe('blob:svg-image'))
    controller.abort()
    cleanup()

    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:svg-image')
  })

  it('does not reinterpret virtual workspace paths as real file URLs', () => {
    const article = createArticle(['./diagram.svg'])
    const cleanup = prepareMarkdownImages({ articleEl: article, documentHref: `${MDP_WS_FILE}guides%2Fcurrent.md` })
    expect(article.images[0].getAttribute('src')).toBe('./diagram.svg')
    expect(mocks.readLocalTextResource).not.toHaveBeenCalled()
    cleanup()
  })
})
