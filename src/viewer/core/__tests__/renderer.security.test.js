// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderDocument, renderIntoElement, sanitizeHtml } from '../renderer.js'

const SETTINGS = { plugins: { codeHighlight: { enabled: false }, math: { enabled: true } } }

function articleFor(html) {
  const article = document.createElement('article')
  renderIntoElement(article, html)
  return article
}

describe('HTML security boundary with real DOMPurify', () => {
  it.each([
    '<script>window.pwned=true</script><img src="x" onerror="window.pwned=true">',
    '<a href="java&#x09;script:alert(1)">bad</a><a href="javascript:alert(1)">bad</a>',
    '<a href="data:text/html,<script>alert(1)</script>">bad</a>',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=">',
    '<svg onload="alert(1)"><a href="javascript:alert(1)">bad</a><foreignObject><iframe srcdoc="bad"></iframe></foreignObject></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">'
  ])('removes scripts, handlers and unsafe resources: %s', async (source) => {
    const result = await renderDocument(source, SETTINGS)
    const article = articleFor(result.html)
    expect(article.querySelector('script, iframe, foreignObject, [onload], [onerror], [srcdoc]')).toBeNull()
    for (const node of article.querySelectorAll('[href], [src]')) {
      expect(node.getAttribute('href') || node.getAttribute('src')).not.toMatch(/^(?:javascript|data):/i)
    }
  })

  it('drops global CSS and overlay styles, including forged KaTeX markup', async () => {
    const result = await renderDocument([
      '<style>body,.mdp-root{display:none!important}@import "https://evil.test/a.css";</style>',
      '<div style="position:fixed;inset:0;z-index:2147483647;transform:scale(100);background:url(https://evil.test/x);color:red">overlay</div>',
      '<span class="katex" data-mdp-math-style="forged" style="top:-50em;position:relative;color:blue">fake math</span>',
      '<div class="mdp-toast mdp-viewer-scrollbar ordinary">fake chrome</div>',
      '<p style="color:var(--attacker);background-color:expression(alert(1))">unsafe</p>'
    ].join('\n\n'), SETTINGS)
    const article = articleFor(result.html)
    expect(article.querySelector('style, link, [data-mdp-math-style]')).toBeNull()
    expect(article.querySelector('div').getAttribute('style')).toBe('color:red')
    expect(article.querySelector('.katex').getAttribute('style')).toBe('color:blue')
    expect(article.querySelector('.mdp-toast, .mdp-viewer-scrollbar')).toBeNull()
    expect(article.querySelector('.ordinary')).not.toBeNull()
    expect(article.innerHTML).not.toMatch(/evil\.test|position:|z-index|transform:|top:|expression\(|var\(/)
  })

  it('keeps code colors, complex KaTeX geometry, MathML, local links and safe images', async () => {
    const result = await renderDocument([
      '# Title', '[local](./guide.md)', '[external](https://example.com)',
      '```javascript\nconst answer = 42\n```',
      '$\\sqrt{\\frac{x^2+1}{y}}+\\overbrace{abc}^{n}$',
      '<img src="data:image/png;base64,iVBORw0KGgo=">'
    ].join('\n\n'), { plugins: { math: { enabled: true }, codeHighlight: { enabled: true } } })
    const article = articleFor(result.html)
    expect(article.querySelector('pre.shiki span[style*="color"]')).not.toBeNull()
    expect(article.querySelector('.katex math')).not.toBeNull()
    expect(article.querySelector('.katex span[style*="top:"]')).not.toBeNull()
    expect(article.querySelector('.katex span[style*="height:"]')).not.toBeNull()
    expect(article.querySelector('a[href="./guide.md"]')).not.toBeNull()
    expect(article.querySelector('a[href="https://example.com"]').rel).toContain('noreferrer')
    expect(article.querySelector('img').src).toMatch(/^data:image\/png/)
    expect(article.querySelector('[data-mdp-math-style]')).toBeNull()
  })

  it('rejects malformed, escaped and unrecognized CSS without returning raw styles', () => {
    for (const style of ['color:r\\65 d;background:url(https://evil.test/x)', 'position:fixed', 'color:var(--x)', 'color:red;{bad']) {
      expect(sanitizeHtml(`<p style="${style}">text</p>`)).not.toMatch(/url\(|position:|var\(|\{bad/)
    }
  })

  it('preserves literal style-like text in Math without leaking internal privileges', async () => {
    const result = await renderDocument('$\\text{ style= }$', SETTINGS)
    const article = articleFor(result.html)
    expect(article.querySelector('.katex-html').textContent).toContain('style=')
    expect(article.innerHTML).not.toContain('data-mdp-math-style')
  })
})
