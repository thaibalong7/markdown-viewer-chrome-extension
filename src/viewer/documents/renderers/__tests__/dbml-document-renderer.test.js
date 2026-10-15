// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createArticle, cleanDom, fire } from '../../../react/content/__tests__/dom-test-helpers.js'

const mocks = vi.hoisted(() => ({ highlightCode: vi.fn(), copy: vi.fn() }))
vi.mock('../../../core/shiki-highlighter.js', async (importOriginal) => ({
  ...await importOriginal(), highlightCode: mocks.highlightCode
}))
vi.mock('../../../../shared/clipboard.js', () => ({ copyTextToClipboard: mocks.copy }))

import { render } from '../dbml-document-renderer.js'
import { getDocumentRenderer } from '../../renderer-registry.js'

const source = "// Schema colors\nTable core.users [headercolor: #3498DB] {\n\tid int [pk]\n  note: 'rgba(59, 130, 246, 0.5)'\n}\n"
const cleanups = []

function renderedSource(articleEl) {
  return articleEl.querySelector('code').textContent
}

async function show(text = source, options = {}) {
  const articleEl = options.articleEl || createArticle()
  const result = await render({ loadedDocument: { text }, articleEl, ...options })
  if (result.cleanup) cleanups.push(result.cleanup)
  return { articleEl, result }
}

beforeEach(async () => {
  vi.clearAllMocks()
  const actual = await vi.importActual('../../../core/shiki-highlighter.js')
  mocks.highlightCode.mockImplementation(actual.highlightCode)
  mocks.copy.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  cleanDom()
})

describe('DBML source renderer', () => {
  it('resolves lazily and renders real DBML highlighting while preserving source and syntax spans', async () => {
    expect((await getDocumentRenderer('dbml')).render).toBe(render)
    const settings = { theme: { activeId: 'dark' } }
    const { articleEl, result } = await show(source, { settings })
    expect(mocks.highlightCode).toHaveBeenCalledWith(source, 'dbml', settings)
    expect(articleEl.querySelector('.mdp-dbml-document__header').textContent).toBe('DBML')
    const pre = articleEl.querySelector('pre.shiki.github-dark[data-mdp-lang="dbml"]')
    expect(pre).not.toBeNull()
    expect(renderedSource(articleEl)).toBe(source)
    expect(pre.querySelectorAll('.line span[style]').length).toBeGreaterThan(5)
    expect([...pre.querySelectorAll('.mdp-color-swatch')].map(node => node.dataset.mdpColor))
      .toEqual(['#3498DB', 'rgba(59, 130, 246, 0.5)'])
    expect(result).toMatchObject({ tocItems: [], interactionProfile: 'none' })
  })

  it('reuses the inspector, copies exact literals and converted formats outside the source', async () => {
    const { articleEl, result } = await show()
    const swatch = articleEl.querySelector('.mdp-color-swatch')
    fire(swatch, 'click')
    await vi.waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('#3498DB'))
    fire(swatch, 'keydown', { key: 'ArrowDown' })
    const panel = document.querySelector('.mdp-color-popover')
    expect(panel).not.toBeNull()
    expect(articleEl.contains(panel)).toBe(false)
    expect(document.activeElement.getAttribute('aria-label')).toBe('Copy HEX')
    fire(panel.querySelector('[aria-label="Copy RGB"]'), 'click')
    await vi.waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('rgb(52, 152, 219)'))
    expect(renderedSource(articleEl)).toBe(source)
    result.cleanup()
    result.cleanup()
    expect(document.querySelector('.mdp-color-popover')).toBeNull()
    expect(articleEl.querySelector('.mdp-color-swatch')).toBeNull()
    expect(renderedSource(articleEl)).toBe(source)
  })

  it('keeps color previews available independently of syntax highlighting', async () => {
    const { articleEl } = await show(source, { settings: { plugins: { codeHighlight: { enabled: false } } } })
    expect(mocks.highlightCode).not.toHaveBeenCalled()
    expect(articleEl.querySelector('pre').dataset.mdpLang).toBe('dbml')
    expect(articleEl.querySelector('pre').className).toBe('mdp-dbml-document__source')
    expect(articleEl.querySelectorAll('.mdp-color-swatch')).toHaveLength(2)
    expect(renderedSource(articleEl)).toBe(source)
  })

  it.each(['\n', '\r\n'])('preserves blank rows, tabs and %j separators in highlighted source', async (separator) => {
    const text = ['Table users {', '\tid int [pk]', '', '  note: \'#3498DB\'', '}', '', ''].join(separator)
    const { articleEl } = await show(text)
    expect(articleEl.querySelector('pre.shiki')).not.toBeNull()
    expect(renderedSource(articleEl)).toBe(text)
    expect(articleEl.querySelector('.mdp-color-swatch')).not.toBeNull()
  })

  it('honors the Color preview toggle without disabling DBML highlighting', async () => {
    const { articleEl } = await show(source, { settings: { plugins: { colorPreview: { enabled: false } } } })
    expect(articleEl.querySelector('pre.shiki')).not.toBeNull()
    expect(articleEl.querySelector('.mdp-color-swatch')).toBeNull()
    expect(renderedSource(articleEl)).toBe(source)
  })

  it('falls back safely when Shiki is unavailable and never interprets source HTML', async () => {
    mocks.highlightCode.mockResolvedValue(null)
    const text = "<script>alert(1)</script>\nTable users [headercolor: #fff] {}"
    const { articleEl } = await show(text)
    expect(articleEl.querySelector('script')).toBeNull()
    expect(articleEl.querySelector('code').textContent).toBe(text)
    expect(articleEl.querySelector('.mdp-color-swatch').dataset.mdpColor).toBe('#fff')
  })

  it('sanitizes highlighted HTML before insertion', async () => {
    mocks.highlightCode.mockResolvedValue('<pre class="shiki"><code>Table users {}</code></pre><script>alert(1)</script><img src="x" onerror="alert(1)">')
    const { articleEl } = await show()
    expect(articleEl.querySelector('script, [onerror]')).toBeNull()
    expect(articleEl.querySelector('code').textContent).toBe('Table users {}')
  })

  it('renders empty and read-error states with scoped cleanup', async () => {
    const empty = await show('')
    expect(empty.articleEl.querySelector('[role="status"]').textContent).toBe('This DBML file is empty.')
    const failed = await show('', { loadedDocument: { loadError: { message: 'File exceeds viewing limit.' } } })
    expect(failed.articleEl.querySelector('[role="alert"]').textContent).toBe('File exceeds viewing limit.')
    expect(mocks.highlightCode).not.toHaveBeenCalled()
    empty.result.cleanup()
    expect(empty.articleEl.textContent).toBe('')
  })

  it('does not insert stale content when navigation aborts an in-flight highlight', async () => {
    const controller = new AbortController()
    const articleEl = createArticle()
    articleEl.textContent = 'Replacement document'
    mocks.highlightCode.mockImplementation(async () => {
      controller.abort()
      return '<pre><code>stale</code></pre>'
    })
    await expect(show(source, { articleEl, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(articleEl.textContent).toBe('Replacement document')
  })

  it('removes an open inspector on document abort and cannot reopen from stale samples', async () => {
    const controller = new AbortController()
    const { articleEl } = await show(source, { signal: controller.signal })
    const swatch = articleEl.querySelector('.mdp-color-swatch')
    fire(swatch, 'keydown', { key: 'ArrowDown' })
    expect(document.querySelector('.mdp-color-popover')).not.toBeNull()
    controller.abort()
    expect(document.querySelector('.mdp-color-popover')).toBeNull()
    expect(articleEl.querySelector('.mdp-color-swatch')).toBeNull()
    fire(swatch, 'keydown', { key: 'ArrowDown' })
    expect(document.querySelector('.mdp-color-popover')).toBeNull()
  })
})
