import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderMermaidIntoNode: vi.fn(),
  closeMermaidLightbox: vi.fn(),
  destroyMermaidLightbox: vi.fn()
}))

vi.mock('../../../mermaid/mermaid-render-service.js', () => ({
  renderMermaidIntoNode: mocks.renderMermaidIntoNode
}))
vi.mock('../../../../plugins/optional/mermaid-lightbox.js', () => ({
  closeMermaidLightbox: mocks.closeMermaidLightbox,
  destroyMermaidLightbox: mocks.destroyMermaidLightbox
}))

import { render } from '../mermaid-document-renderer.js'

function createNode(tagName) {
  const node = {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    children: [],
    attributes: {},
    appendChild(child) {
      this.children.push(child)
      return child
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    closest() {
      return { className: 'mdp-root' }
    }
  }
  Object.defineProperty(node, 'innerHTML', {
    set() {
      throw new Error('standalone renderer must delegate SVG insertion to the shared service')
    }
  })
  return node
}

function createHarness() {
  const ownerDocument = { createElement: vi.fn((tagName) => createNode(tagName)) }
  const articleEl = createNode('article')
  articleEl.ownerDocument = ownerDocument
  articleEl.replaceChildren = function (...children) {
    this.children = children
  }
  return { articleEl }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.renderMermaidIntoNode.mockResolvedValue({ cleanup: vi.fn() })
})

describe('standalone Mermaid document renderer', () => {
  it('uses the shared Mermaid service in rendered mode regardless of plugin enabled state', async () => {
    const { articleEl } = createHarness()
    const source = 'flowchart LR\nA-->B'
    const services = { copyCodeWithToast: vi.fn() }
    const result = await render({
      loadedDocument: { document: { viewMode: 'rendered' }, text: source },
      articleEl,
      settings: { plugins: { mermaid: { enabled: false, renderer: 'official' } } },
      services,
      signal: new AbortController().signal
    })

    expect(articleEl.children[0]).toMatchObject({
      className: 'mdp-mermaid mdp-mermaid-document',
      textContent: source
    })
    expect(mocks.renderMermaidIntoNode).toHaveBeenCalledWith(expect.objectContaining({
      node: articleEl.children[0],
      source,
      settings: { plugins: { mermaid: { enabled: false, renderer: 'official' } } },
      copyCodeWithToast: services.copyCodeWithToast
    }))
    result.cleanup()
    expect(mocks.closeMermaidLightbox).toHaveBeenCalledOnce()
    expect(mocks.destroyMermaidLightbox).toHaveBeenCalledOnce()
  })

  it('renders raw source only through textContent and preserves it byte-for-byte', async () => {
    const { articleEl } = createHarness()
    const source = '<script>alert(1)</script>\n\tflowchart LR  '
    await render({
      loadedDocument: { document: { viewMode: 'raw' }, text: source },
      articleEl
    })

    expect(articleEl.children[0].className).toBe('mdp-mermaid-document__source')
    expect(articleEl.children[0].children[0]).toMatchObject({ tagName: 'CODE', textContent: source })
    expect(mocks.renderMermaidIntoNode).not.toHaveBeenCalled()
  })

  it('shows a safe accessible load error', async () => {
    const { articleEl } = createHarness()
    await render({
      loadedDocument: { loadError: { message: 'Could not open this text file.' } },
      articleEl
    })
    expect(articleEl.children[0]).toMatchObject({
      textContent: 'Could not open this text file.',
      attributes: { role: 'alert' }
    })
  })

  it('shows an explicit empty state in rendered mode', async () => {
    const { articleEl } = createHarness()
    await render({
      loadedDocument: { document: { viewMode: 'rendered' }, text: '' },
      articleEl
    })
    expect(articleEl.children[0]).toMatchObject({
      textContent: 'This Mermaid file is empty.',
      attributes: { role: 'status' }
    })
    expect(mocks.renderMermaidIntoNode).not.toHaveBeenCalled()
  })
})
