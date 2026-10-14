// @vitest-environment jsdom
import { createArticle as createRealArticle, cleanDom, fire } from '../../../react/content/__tests__/dom-test-helpers.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '../image-document-renderer.js'

afterEach(cleanDom)

function createHarness() { return { articleEl: createRealArticle() } }

describe('image document renderer', () => {
  it('renders through img.src, preserves an accessible loading state, and enables zoom on load', async () => {
    const { articleEl } = createHarness()
    const prepareZoomableImages = vi.fn()
    const renderPromise = render({
      loadedDocument: {
        document: { displayName: 'Xin chào.png' },
        assetUrl: 'blob:photo'
      },
      articleEl,
      services: { prepareZoomableImages }
    })
    await Promise.resolve()

    const [figure] = articleEl.children
    const [loadingSlot, image] = figure.children
    const loading = loadingSlot.firstElementChild
    expect(loading).toMatchObject({
      className: expect.stringContaining('mdp-ui-loading-state'),
      role: 'status', ariaBusy: 'true'
    })
    expect(loading.children[1].textContent).toBe('Loading Xin chào.png…')
    expect(image).toMatchObject({
      tagName: 'IMG',
      className: 'mdp-image-document__image',
      src: 'blob:photo',
      alt: 'Xin chào.png',
      hidden: true
    })

    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 640 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 480 })
    fire(image, 'load')
    const result = await renderPromise
    expect(image.hidden).toBe(false)
    expect([...figure.children]).toEqual([image])
    expect(prepareZoomableImages).toHaveBeenCalledOnce()

    result.cleanup()
    result.cleanup()
    fire(image, 'load')
    expect(prepareZoomableImages).toHaveBeenCalledOnce()
  })

  it('shows safe errors for failed loading and corrupt image decoding', async () => {
    const { articleEl } = createHarness()
    await render({
      loadedDocument: {
        document: { displayName: '<script>.png' },
        loadError: { message: 'Could not open this image.' }
      },
      articleEl
    })
    expect(articleEl.children[0]).toMatchObject({
      textContent: 'Could not open this image.',
      role: 'alert'
    })

    const next = createHarness()
    const brokenRender = render({
      loadedDocument: {
        document: { displayName: '<script>.png' },
        assetUrl: 'file:///broken.png'
      },
      articleEl: next.articleEl
    })
    await Promise.resolve()
    const figure = next.articleEl.children[0]
    fire(figure.children[1], 'error')
    await brokenRender
    expect(figure.children[0]).toMatchObject({
      textContent: 'Could not display <script>.png.',
      role: 'alert'
    })
  })

  it('mounts SVG only through img.src and never inserts source markup', async () => {
    const { articleEl } = createHarness()
    const renderPromise = render({
      loadedDocument: {
        document: { displayName: 'unsafe.svg', fileTypeId: 'svg-image' },
        text: '<svg onload="alert(1)"><script>alert(1)</script></svg>',
        assetUrl: 'blob:unsafe-svg'
      },
      articleEl
    })
    await Promise.resolve()

    const [loadingSlot, image] = articleEl.children[0].children
    const loading = loadingSlot.firstElementChild
    expect(loading.children[1].textContent).toBe('Loading unsafe.svg…')
    expect(image).toMatchObject({
      tagName: 'IMG',
      src: 'blob:unsafe-svg',
      alt: 'unsafe.svg',
      dataset: { mdpFileType: 'svg-image' }
    })
    expect([...articleEl.children[0].children].every((node) => node.tagName !== 'SVG')).toBe(true)
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 100 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 100 })
    fire(image, 'load')
    await renderPromise
  })
})
