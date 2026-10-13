import { describe, expect, it, vi } from 'vitest'
import { createMarkdownEngine, injectSourceLineMapping } from '../../../viewer/core/markdown-engine.js'
import { renderDocument } from '../../../viewer/core/renderer.js'
import { githubAlertsPlugin } from '../github-alerts.plugin.js'

const iconMocks = vi.hoisted(() => ({ create: vi.fn(() => ({})) }))
vi.mock('../../../shared/icons/create-app-icon.js', () => ({ createAppIconSvg: iconMocks.create }))

function render(source) {
  const engine = createMarkdownEngine()
  githubAlertsPlugin.extendMarkdown({ markdownEngine: engine })
  injectSourceLineMapping(engine.instance)
  return engine.instance.render(source)
}

describe('GitHub Alerts', () => {
  it.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])('renders %s with a visible label and source mapping', (type) => {
    const html = render(`> [!${type}]\n> Nội dung **quan trọng**.`)
    expect(html).toContain(`class="mdp-alert mdp-alert--${type.toLowerCase()}"`)
    expect(html).toContain('role="note"')
    expect(html).not.toContain('role="alert"')
    expect(html).toContain(`aria-label="${type[0]}${type.slice(1).toLowerCase()}" data-line="0"`)
    expect(html).toContain('<p data-line="1">Nội dung <strong>quan trọng</strong>.</p>')
    expect(html).not.toContain(`[!${type}]`)
  })

  it('preserves paragraphs, lists, code, links and headings inside the body', () => {
    const html = render('> [!NOTE]\n>\n> First paragraph.\n>\n> ## Details\n>\n> - One\n> - Two\n>\n> [Docs](https://example.com) and `code`.\n>\n> ```js\n> const n = 1\n> ```')
    expect(html).toContain('<p data-line="2">First paragraph.</p>')
    expect(html).toContain('id="details"')
    expect(html).toContain('<ul data-line="6">')
    expect(html).toContain('target="_blank" rel="noopener noreferrer"')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('const n = 1')
  })

  it.each(['> [!TIP]', '> [!TIP]\n>\n> Body', '> [!TIP]  \n> Body', '> [!TIP]\r\n> Body'])('handles empty, separated and hard-break markers: %s', (source) => {
    const html = render(source)
    expect(html).toContain('mdp-alert--tip')
    expect(html).not.toContain('[!TIP]')
    expect(html).not.toContain('<p data-line="0"></p>')
  })

  it.each([
    '> Ordinary quote', '> [!UNKNOWN]\n> Body', '> [!note]\n> Body',
    '> [!NOTE] same-line text', '> \\[!NOTE]\n> Body', '> `[!NOTE]`\n> Body',
    '> First line\n> [!NOTE]\n> Body', '> > [!NOTE]\n> > Nested',
    '- Item\n\n  > [!NOTE]\n  > Nested', '```md\n> [!NOTE]\n> Literal\n```',
    '<blockquote>[!NOTE]<br>Raw HTML</blockquote>'
  ])('leaves ordinary, literal or nested content unchanged: %s', (source) => {
    expect(render(source)).not.toContain('class="mdp-alert ')
  })

  it('keeps adjacent alerts separate and leaves a following quote unchanged', () => {
    const html = render('> [!NOTE]\n> One\n\n> [!WARNING]\n> Two\n\n> Plain')
    expect(html.match(/class="mdp-alert mdp-alert--/g)).toHaveLength(2)
    expect(html).toContain('<blockquote data-line="6">')
  })

  it('keeps reference links rather than treating them as markers', () => {
    const html = render('> [!NOTE]\n> Body\n\n[!NOTE]: https://example.com')
    expect(html).not.toContain('class="mdp-alert ')
    expect(html).toContain('href="https://example.com"')
  })

  it('adds shared decorative icons once and ignores unknown raw-HTML types', () => {
    iconMocks.create.mockClear()
    const titles = ['note', 'tip', 'important', 'warning', 'caution', 'unknown'].map(type => {
      let icon = null
      return {
        parentElement: { getAttribute: () => type },
        querySelector: () => icon,
        prepend: vi.fn(value => { icon = value })
      }
    })
    const articleEl = { querySelectorAll: () => titles }
    githubAlertsPlugin.afterRender({ articleEl })
    githubAlertsPlugin.afterRender({ articleEl })
    expect(iconMocks.create.mock.calls.map(([name]) => name)).toEqual(['info', 'check', 'info', 'warning', 'error'])
    expect(titles[5].prepend).not.toHaveBeenCalled()
    expect(titles[0].prepend).toHaveBeenCalledOnce()
  })

  it('is enabled through default registration and toggles with render-context caching', async () => {
    const plugins = { codeHighlight: { enabled: false }, emoji: { enabled: false }, footnote: { enabled: false }, math: { enabled: false }, mermaid: { enabled: false } }
    const cache = new Map()
    const source = '> [!NOTE]\n> Body'
    const enabled = await renderDocument(source, { plugins }, { renderContextCache: cache })
    const disabled = await renderDocument(source, { plugins: { ...plugins, githubAlerts: { enabled: false } } }, { renderContextCache: cache })
    const restored = await renderDocument(source, { plugins }, { renderContextCache: cache })
    expect(enabled.html).toContain('mdp-alert--note')
    expect(disabled.html).toContain('[!NOTE]')
    expect(disabled.html).not.toContain('mdp-alert--note')
    expect(enabled.metadata.settingsHash).not.toBe(disabled.metadata.settingsHash)
    expect(restored.html).toBe(enabled.html)
  })
})
