import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  highlightCode: vi.fn(),
  renderIntoElement: vi.fn((element, html) => {
    element.renderedHtml = html
  }),
  sanitizeHtml: vi.fn((html) => `safe:${html}`)
}))

vi.mock('../../../core/shiki-highlighter.js', () => ({
  highlightCode: mocks.highlightCode
}))
vi.mock('../../../core/renderer.js', () => ({
  renderIntoElement: mocks.renderIntoElement,
  sanitizeHtml: mocks.sanitizeHtml
}))

import { render } from '../sql-document-renderer.js'

function createNode(tagName) {
  return {
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
  mocks.highlightCode.mockResolvedValue('<pre class="shiki"><code>SELECT</code></pre>')
})

describe('SQL document renderer', () => {
  it('renders a dedicated SQL card with sanitized syntax highlighting', async () => {
    const { articleEl } = createHarness()
    const settings = { theme: { preset: 'dark' }, plugins: { codeHighlight: { enabled: true } } }

    await render({
      loadedDocument: { text: 'SELECT * FROM users;' },
      articleEl,
      settings,
      signal: new AbortController().signal
    })

    expect(mocks.highlightCode).toHaveBeenCalledWith('SELECT * FROM users;', 'sql', settings)
    expect(mocks.sanitizeHtml).toHaveBeenCalledWith(
      '<pre class="shiki"><code>SELECT</code></pre>'
    )
    const [container] = articleEl.children
    expect(container.className).toBe('mdp-sql-document')
    expect(container.children[0]).toMatchObject({
      className: 'mdp-sql-document__header',
      textContent: 'SQL'
    })
    expect(container.children[1]).toMatchObject({
      className: 'mdp-sql-document__highlighted',
      renderedHtml: 'safe:<pre class="shiki"><code>SELECT</code></pre>'
    })
  })

  it('falls back to textContent when highlighting is disabled or unavailable', async () => {
    const source = '<script>alert(1)</script>\nSELECT 1;'
    const { articleEl } = createHarness()

    await render({
      loadedDocument: { text: source },
      articleEl,
      settings: { plugins: { codeHighlight: { enabled: false } } }
    })

    expect(mocks.highlightCode).not.toHaveBeenCalled()
    const pre = articleEl.children[0].children[1]
    expect(pre).toMatchObject({
      className: 'mdp-sql-document__source',
      attributes: { 'data-mdp-lang': 'sql' }
    })
    expect(pre.children[0]).toMatchObject({ tagName: 'CODE', textContent: source })
  })

  it('shows SQL-specific empty and error states', async () => {
    const empty = createHarness()
    await render({ loadedDocument: { text: '' }, articleEl: empty.articleEl })
    expect(empty.articleEl.children[0]).toMatchObject({
      textContent: 'This SQL file is empty.',
      attributes: { role: 'status' }
    })

    const failed = createHarness()
    await render({
      loadedDocument: { loadError: { message: 'SQL file is too large.' } },
      articleEl: failed.articleEl
    })
    expect(failed.articleEl.children[0]).toMatchObject({
      textContent: 'SQL file is too large.',
      attributes: { role: 'alert' }
    })
  })
})
