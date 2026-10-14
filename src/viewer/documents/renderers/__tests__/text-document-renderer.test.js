// @vitest-environment jsdom
import { createArticle as createRealArticle, cleanDom } from '../../../react/content/__tests__/dom-test-helpers.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '../text-document-renderer.js'

afterEach(cleanDom)

function createHarness() { const articleEl = createRealArticle(); return { articleEl, ownerDocument: document } }

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
      role: 'status'
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
      role: 'alert'
    })
  })
})
