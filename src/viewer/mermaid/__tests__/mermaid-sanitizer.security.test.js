// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeMermaidSvg } from '../mermaid-sanitizer.js'

function clean(source) {
  const host = document.createElement('div')
  host.innerHTML = sanitizeMermaidSvg(source)
  return host
}

describe('Mermaid SVG security boundary with real DOMPurify', () => {
  it('removes active content, event handlers and external/data references', () => {
    const host = clean(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <script>alert(1)</script><foreignObject><div>bad</div></foreignObject>
      <image href="data:image/svg+xml,bad"/><use href="https://evil.test/image.svg#x"/>
      <a href="javascript:alert(1)"><text onclick="alert(1)">Label</text></a>
      <rect fill="url(https://evil.test/x)" filter="url(data:image/svg+xml,bad)"/>
      <animate attributeName="href" values="javascript:alert(1)"/>
      </svg>`)
    expect(host.querySelector('script, foreignObject, image, animate, [onload], [onclick], [href], [fill], [filter]')).toBeNull()
    expect(host.textContent).toContain('Label')
    expect(host.innerHTML).not.toContain('evil.test')
  })

  it.each([
    '@import url("https://evil.test/a.css");',
    '@import "https://evil.test/a.css";',
    '@import \'//evil.test/a.css\';',
    '@font-face{font-family:x;src:url(https://evil.test/a.woff2)}',
    '@media all{body{display:none}}',
    '@keyframes x{to{fill:red}}'
  ])('drops at-rules, including remote imports: %s', (css) => {
    const host = clean(`<svg><style>${css} .node{fill:red}</style><rect class="node"/></svg>`)
    expect(host.querySelector('style').textContent).not.toMatch(/@|evil\.test/)
    expect(host.querySelector('style').textContent).toContain('fill:red')
  })

  it('scopes every selector subject and rejects pseudo/attribute selectors and overlay declarations', () => {
    const host = clean(`<svg id="chart"><style>
      body,.mdp-root,svg + button,#chart .node {fill:red;position:fixed;z-index:999;transform:scale(100)}
      .node:hover, [id], :root, :has(*) {fill:blue}
      .node{fill:url(https://evil.test/x);stroke:url(//evil.test/y)}
      </style><rect class="node"/></svg>`)
    const css = host.querySelector('style').textContent
    const scope = host.querySelector('svg').dataset.mdpDiagramScope
    expect(css).toContain(`[data-mdp-diagram-scope="${scope}"]`)
    expect(css).not.toMatch(/position:|z-index|transform:|:hover|:root|:has|evil\.test|\[id\]/)
    expect(css.split('\n').every((rule) => rule.startsWith(':where([data-mdp-diagram-scope='))).toBe(true)
  })

  it('namespaces local IDs/references per diagram and keeps safe marker/style variables', () => {
    const source = `<svg id="chart" class="mdp-toast" aria-labelledby="chart-title" style="--fg:#123456;--_text:var(--fg);position:fixed">
      <title id="chart-title">Accessible chart</title>
      <style style="position:fixed">#chart text{fill:var(--_text)} .edge{marker-end:url(#arrow);stroke-width:2px}</style>
      <defs><marker id="arrow"><path d="M0 0 L5 5"/></marker></defs>
      <path class="edge" marker-end="url(#arrow)"/><use href="#arrow"/><text>Hello</text></svg>`
    const first = clean(source)
    const second = clean(source)
    const marker = first.querySelector('marker').id
    expect(second.querySelector('marker').id).not.toBe(marker)
    expect(first.querySelector('use')).toBeNull()
    expect(first.querySelector('.edge').getAttribute('marker-end')).toBe(`url(#${marker})`)
    expect(first.querySelector('style').textContent).toContain(`url(#${marker})`)
    expect(first.querySelector('svg').style.getPropertyValue('--fg')).toBe('#123456')
    expect(first.querySelector('svg').style.overflow).toBe('hidden')
    expect(first.querySelector('svg').getAttribute('aria-labelledby')).toBe(first.querySelector('title').id)
    expect(first.querySelector('.mdp-toast')).toBeNull()
    expect(first.innerHTML).not.toContain('position:')
  })

  it('rejects non-SVG roots and multiple SVG roots', () => {
    expect(sanitizeMermaidSvg('<div>bad</div>')).toBe('')
    expect(sanitizeMermaidSvg('<svg/><svg/>')).toBe('')
  })

  it('cannot break out of a style element when serializing and reparsing CSS strings', () => {
    const host = clean('<svg><style>text{font-family:"&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;"}</style><text>Safe</text></svg>')
    expect(host.querySelector('script')).toBeNull()
  })
})
