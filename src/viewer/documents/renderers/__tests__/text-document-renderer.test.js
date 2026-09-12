import { describe, expect, it, vi } from 'vitest'
import { render } from '../text-document-renderer.js'

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
    }
  }
  Object.defineProperty(node, 'innerHTML', {
    set() {
      throw new Error('text renderer must not use innerHTML')
    }
  })
  return node
}

function createHarness() {
  const ownerDocument = { createElement: vi.fn((tagName) => createNode(tagName)) }
  const articleEl = {
    ownerDocument,
    children: [],
    replaceChildren(...children) {
      this.children = children
    }
  }
  return { ownerDocument, articleEl }
}

describe('plain text document renderer', () => {
  it('renders HTML-looking, Unicode, whitespace, and long lines only through textContent', async () => {
    const source = `<script>alert('no')</script>\n\tXin chào 👋  \n${'x'.repeat(10_000)}`
    const { articleEl } = createHarness()

    await expect(render({
      loadedDocument: { text: source },
      articleEl,
      signal: new AbortController().signal
    })).resolves.toEqual({ tocItems: [], interactionProfile: 'none' })

    const [pre] = articleEl.children
    expect(pre.tagName).toBe('PRE')
    expect(pre.className).toBe('mdp-text-document')
    expect(pre.children[0].tagName).toBe('CODE')
    expect(pre.children[0].textContent).toBe(source)
  })

  it('renders an accessible empty state', async () => {
    const { articleEl } = createHarness()
    await render({ loadedDocument: { text: '' }, articleEl })

    expect(articleEl.children[0]).toMatchObject({
      textContent: 'This text file is empty.',
      attributes: { role: 'status' }
    })
  })

  it('renders a safe accessible load error', async () => {
    const { articleEl } = createHarness()
    await render({
      loadedDocument: {
        loadError: { code: 'document-too-large', message: 'This text file is too large.' }
      },
      articleEl
    })

    expect(articleEl.children[0]).toMatchObject({
      textContent: 'This text file is too large.',
      attributes: { role: 'alert' }
    })
  })
})
