import { renderDocument, renderIntoElement } from '/src/viewer/core/renderer.js'
import { renderMermaidIntoNode } from '/src/viewer/mermaid/mermaid-render-service.js'
import { sanitizeMermaidSvg } from '/src/viewer/mermaid/mermaid-sanitizer.js'
import { exportMermaidSvg, exportMermaidPng } from '/src/plugins/optional/mermaid-export.js'
import contentCss from '/src/viewer/styles/content.scss?inline'
import baseCss from '/src/viewer/styles/base.scss?inline'
import layoutCss from '/src/viewer/styles/layout.scss?inline'

const results = document.querySelector('#results')
const article = document.querySelector('#article')
const sentinel = document.querySelector('#security-chrome-sentinel')
const settings = { theme: { activeId: 'light', customThemes: [] }, plugins: { math: { enabled: true }, codeHighlight: { enabled: true } } }
const resource = `${location.origin}/__security-resource`
let assertions = 0
function check(label, condition) {
  if (!condition) throw new Error(label)
  assertions++
  results.textContent += `PASS ${label}\n`
}
function chromeIsIntact() {
  const style = getComputedStyle(sentinel)
  const bounds = sentinel.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' &&
    bounds.width > 0 && document.elementFromPoint(bounds.x + 2, bounds.y + 2) === sentinel
}
function injectViewerStyles({ id = 'content', cssText }) {
  let style = document.getElementById(`security-${id}`)
  if (!style) { style = document.createElement('style'); style.id = `security-${id}`; document.head.append(style) }
  style.textContent = cssText
}

try {
  results.textContent = `${navigator.userAgent}\n`
  injectViewerStyles({ cssText: contentCss })
  injectViewerStyles({ id: 'base', cssText: baseCss })
  injectViewerStyles({ id: 'layout', cssText: layoutCss })
  const markdown = [
    '# Safe document', '~~~javascript\nconst answer = 42\n~~~',
    '$\\sqrt{\\frac{x^2+1}{y}}+\\overbrace{abc}^{n}$',
    '<script>window.securityPwned=true</script><img src="data:," onerror="window.securityPwned=true">',
    '<a href="javascript:alert(1)">Unsafe</a><img src="data:image/svg+xml,bad">',
    '<style>body,.mdp-root,#security-chrome-sentinel{display:none!important}</style>',
    `<div style="position:fixed;inset:0;z-index:2147483647;background:url(${resource});color:red">Overlay fixture</div>`,
    '<span class="katex" data-mdp-math-style="forged" style="position:fixed;top:0;left:0">Forged math</span>',
    '<div class="mdp-toast mdp-viewer-scrollbar">Forged Viewer chrome</div>'
  ].join('\n\n')
  const rendered = await renderDocument(markdown, settings, { injectViewerStyles })
  renderIntoElement(article, rendered.html)
  check('HTML active content and unsafe URLs removed', !article.querySelector('script, style, [onerror], [src^="data:image/svg"], [href^="javascript:"]') && !window.securityPwned)
  check('Raw fixed overlay and forged math geometry removed', !article.innerHTML.includes('position:fixed'))
  check('Document cannot opt into Viewer overlay classes', !article.querySelector('.mdp-toast, .mdp-viewer-scrollbar'))
  check('Shiki colors preserved', article.querySelector('pre.shiki span[style*="color"]'))
  check('KaTeX HTML, MathML and geometry preserved', article.querySelector('.katex math') && article.querySelector('.katex span[style*="top:"]'))
  check('Viewer control remains visible and clickable after HTML', chromeIsIntact())

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><style>
    @import url("${resource}?url"); @import "${resource}?string";
    @font-face{font-family:evil;src:url(${resource}?font)}
    body,.mdp-root,#security-chrome-sentinel,svg + button{display:none!important}
    text{fill:red;font-size:16px;position:fixed}
    rect{fill:url(${resource}?paint)}
    </style><rect width="200" height="80"/><text x="10" y="30">Scoped SVG</text></svg>`
  const svgHost = document.createElement('div')
  svgHost.innerHTML = sanitizeMermaidSvg(svg)
  document.querySelector('#diagrams').append(svgHost)
  check('SVG imports, remote resources and positioning removed', !svgHost.innerHTML.includes('__security-resource') && !svgHost.innerHTML.includes('position:'))
  check('SVG styles still apply inside the diagram', getComputedStyle(svgHost.querySelector('text')).fill === 'rgb(255, 0, 0)')
  check('SVG global and sibling selectors cannot hide Viewer control', chromeIsIntact())

  const sources = [
    ['flowchart', 'flowchart LR\nA[Read] --> B[Done]\nclassDef accent fill:#ffcccc,stroke:#990000;\nclass A accent'],
    ['state', 'stateDiagram-v2\n[*] --> Reading\nReading --> Done\nclassDef accent fill:#ffcccc,stroke:#990000\nclass Reading accent'],
    ['overlay classDef', 'flowchart LR\nA[Read] --> B[Done]\nclassDef attack fill:#ffcccc,position:fixed,z-index:2147483647;\nclass A attack'],
    ['remote classDef', `flowchart LR\nA[Read] --> B[Done]\nclassDef attack fill:url(${resource}?classdef),stroke:#990000;\nclass A attack`],
    ['themeCSS directive', `%%{init: ${JSON.stringify({ themeCSS: `@import "${resource}?directive"; body{display:none!important}` })}}%%\nflowchart LR\nA[Read] --> B[Done]`],
    ['CSS injection', 'flowchart LR\nA[Read] --> B[Done]\nclassDef attack fill:red;} body{display:none} /*;\nclass A attack']
  ]
  for (const renderer of ['official', 'beautiful']) {
    for (const [label, source] of sources) {
      const node = document.createElement('div')
      node.className = 'mdp-mermaid'
      document.querySelector('#diagrams').append(node)
      const rendered = await renderMermaidIntoNode({ node, source, settings: { ...settings, plugins: { ...settings.plugins, mermaid: { enabled: true, renderer } } } })
      const valid = !node.classList.contains('mdp-mermaid--error')
      const negativeFixture = ['CSS injection', 'remote classDef'].includes(label)
      check(`${renderer}: ${label} renders or safely rejects CSS injection`, (negativeFixture || valid) && (valid ? node.querySelector(':scope > svg') : node.textContent.includes(source)))
      check(`${renderer}: ${label} keeps Viewer chrome safe`, chromeIsIntact() && !node.querySelector('script, [onload], [onerror]') && !node.querySelector('svg')?.outerHTML.includes('position:fixed'))
      if (valid && label === 'flowchart') {
        check(`${renderer}: chart retains fill styling`, [...node.querySelectorAll('rect, polygon, path')].some((shape) => getComputedStyle(shape).fill === 'rgb(255, 204, 204)'))
        // Capture download data at the final DOM action; no files leave this fixture.
        const downloads = []
        const originalClick = HTMLAnchorElement.prototype.click
        HTMLAnchorElement.prototype.click = function () { downloads.push({ href: this.href, filename: this.download }) }
        try {
          exportMermaidSvg(node)
          await exportMermaidPng(node, { scale: 2 })
          check(`${renderer}: sanitized SVG and PNG export still work`, downloads.length === 2 && downloads.some((download) => download.filename.endsWith('.png')))
        } finally { HTMLAnchorElement.prototype.click = originalClick }
      }
      rendered.cleanup()
    }
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  check('Blocked CSS never fetched a remote resource', !performance.getEntriesByType('resource').some((entry) => entry.name.includes('__security-resource')))
  results.textContent += `ALL ${assertions} CHECKS PASSED\n`
  document.title = `PASS: ${assertions} sanitizer security checks`
} catch (error) {
  results.textContent += `FAIL ${error.stack}\n`
  document.title = 'FAIL: sanitizer security regression'
}
