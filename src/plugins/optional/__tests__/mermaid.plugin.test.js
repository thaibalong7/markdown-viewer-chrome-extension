import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ renderMermaidIntoNode: vi.fn() }))
vi.mock('../../../viewer/mermaid/mermaid-render-service.js', () => ({
  renderMermaidIntoNode: mocks.renderMermaidIntoNode
}))
vi.mock('../mermaid-lightbox.js', () => ({
  closeMermaidLightbox: vi.fn(),
  destroyMermaidLightbox: vi.fn()
}))
vi.mock('../../../shared/logger.js', () => ({ logger: { warn: vi.fn() } }))

import { mermaidPlugin } from '../mermaid.plugin.js'

describe('Mermaid Markdown plugin adapter', () => {
  it('keeps fence discovery in the plugin and delegates rendering to the shared service', async () => {
    const nodeCleanup = vi.fn()
    mocks.renderMermaidIntoNode.mockResolvedValue({ cleanup: nodeCleanup })
    const node = { textContent: 'flowchart LR\nA-->B' }
    const articleEl = {
      ownerDocument: { createElement: vi.fn() },
      closest: () => null,
      querySelectorAll(selector) {
        if (selector.includes('.mdp-code-block') || selector.includes('pre > code')) return []
        if (selector.includes(':not([data-mermaid-processed')) return [node]
        if (selector === '.mdp-markdown-body .mdp-mermaid') return [node]
        return []
      }
    }
    const settings = { plugins: { mermaid: { enabled: true, renderer: 'official' } } }
    const signal = new AbortController().signal

    const cleanup = await mermaidPlugin.afterRender({ articleEl, settings, signal })

    expect(mocks.renderMermaidIntoNode).toHaveBeenCalledWith(expect.objectContaining({
      node,
      source: node.textContent,
      settings,
      chartIndex: 1
    }))
    cleanup()
    expect(nodeCleanup).toHaveBeenCalledOnce()
  })

  it('preserves the escaped Mermaid fence placeholder contract', () => {
    const defaultFence = vi.fn().mockReturnValue('<pre>fallback</pre>')
    const markdownEngine = {
      instance: {
        renderer: { rules: { fence: defaultFence } },
        utils: { escapeHtml: (value) => value.replaceAll('<', '&lt;') }
      }
    }
    mermaidPlugin.extendMarkdown({ markdownEngine })

    const html = markdownEngine.instance.renderer.rules.fence([
      { info: 'mermaid title=test', content: 'flowchart LR\nA<-->B\n' }
    ], 0, {}, {}, {})
    expect(html).toBe('<div class="mdp-mermaid">flowchart LR\nA&lt;-->B</div>\n')
  })
})
