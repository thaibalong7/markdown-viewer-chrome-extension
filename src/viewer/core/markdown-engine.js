import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'

function createBaseEngine() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  })

  // Add stable `id` attributes to headings so we can build a TOC.
  // `permalink: false` keeps the rendered HTML clean (no extra anchor links).
  md.use(anchor, {
    permalink: false,
    // Include all heading levels by default.
    level: [1, 2, 3, 4, 5, 6]
  })

  // Ensure external links open in new tab and are safe.
  const defaultLinkOpenRule = md.renderer.rules.link_open
  md.renderer.rules.link_open = function linkOpen(tokens, idx, options, env, self) {
    const token = tokens[idx]
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')

    if (typeof defaultLinkOpenRule === 'function') {
      return defaultLinkOpenRule(tokens, idx, options, env, self)
    }
    return self.renderToken(tokens, idx, options)
  }

  // After plugins: default softbreak is a raw `\n`, which HTML collapses inside `<p>` to a space.
  md.renderer.rules.softbreak = (_tokens, _idx, options) => (options.xhtmlOut ? '<br />\n' : '<br>\n')

  return md
}

export function createMarkdownEngine() {
  return {
    instance: createBaseEngine()
  }
}

export function renderMarkdown(markdown, { markdownEngine } = {}) {
  const source = String(markdown || '')
  const engine = markdownEngine?.instance || createBaseEngine()
  const html = engine.render(source)
  return { html }
}
