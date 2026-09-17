import { describe, expect, it, vi } from 'vitest'
import { render } from '../image-document-renderer.js'

function createNode(tagName) {
  const listeners = new Map()
  const node = {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    children: [],
    attributes: {},
    hidden: false,
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    append(...children) {
      for (const child of children) {
        child.parentNode = this
        this.children.push(child)
      }
    },
    replaceChildren(...children) {
      this.children = []
      this.append(...children)
    },
    remove() {
      if (!this.parentNode) return
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this)
      this.parentNode = null
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
    dispatch(type) {
      listeners.get(type)?.({ type, target: this })
    },
    listenerCount() {
      return listeners.size
    }
  }
  Object.defineProperty(node, 'innerHTML', {
    set() {
      throw new Error('image renderer must not use innerHTML')
    }
  })
  return node
}

function createHarness() {
  const ownerDocument = { createElement: vi.fn((tagName) => createNode(tagName)) }
  const articleEl = createNode('article')
  articleEl.ownerDocument = ownerDocument
  return { articleEl }
}

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
    const [loading, image] = figure.children
    expect(loading).toMatchObject({
      className: expect.stringContaining('mdp-ui-loading-state'),
      attributes: { role: 'status', 'aria-busy': 'true' }
    })
    expect(loading.children[1].textContent).toBe('Loading Xin chào.png…')
    expect(image).toMatchObject({
      tagName: 'IMG',
      className: 'mdp-image-document__image',
      src: 'blob:photo',
      alt: 'Xin chào.png',
      hidden: true
    })

    image.naturalWidth = 640
    image.naturalHeight = 480
    image.dispatch('load')
    const result = await renderPromise
    expect(image.hidden).toBe(false)
    expect(figure.children).toEqual([image])
    expect(prepareZoomableImages).toHaveBeenCalledOnce()

    result.cleanup()
    result.cleanup()
    expect(image.listenerCount()).toBe(0)
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
      attributes: { role: 'alert' }
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
    figure.children[1].dispatch('error')
    await brokenRender
    expect(figure.children[0]).toMatchObject({
      textContent: 'Could not display <script>.png.',
      attributes: { role: 'alert' }
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

    const [loading, image] = articleEl.children[0].children
    expect(loading.children[1].textContent).toBe('Loading unsafe.svg…')
    expect(image).toMatchObject({
      tagName: 'IMG',
      src: 'blob:unsafe-svg',
      alt: 'unsafe.svg'
    })
    expect(articleEl.children[0].children.every((node) => node.tagName !== 'SVG')).toBe(true)
    image.naturalWidth = 100
    image.naturalHeight = 100
    image.dispatch('load')
    await renderPromise
  })
})
