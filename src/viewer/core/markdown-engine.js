import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { normalizeLocalMarkdownLinkDestinations } from './markdown-link-normalizer.js'

function isExternalHref(href) {
  if (!href) return false
  const value = String(href).trimStart()
  return /^https?:/i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)
}

function createBaseEngine() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  })

  const UNSAFE_PROTO_RE = /^(vbscript|javascript|data):/i
  md.validateLink = (url) => !UNSAFE_PROTO_RE.test(url.trim())

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
    const href = token.attrGet('href') || ''
    if (isExternalHref(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }

    if (typeof defaultLinkOpenRule === 'function') {
      return defaultLinkOpenRule(tokens, idx, options, env, self)
    }
    return self.renderToken(tokens, idx, options)
  }

  // After plugins: default softbreak is a raw `\n`, which HTML collapses inside `<p>` to a space.
  md.renderer.rules.softbreak = (_tokens, _idx, options) => (options.xhtmlOut ? '<br />\n' : '<br>\n')

  return md
}

const BLOCK_OPEN_RULES = [
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'table_open'
]

/**
 * Add `data-line` (0-based source line) on block output for editor–preview scroll sync.
 * Call **after** `pluginManager.extendMarkdown` so Mermaid/others are wrapped correctly.
 * @param {object} md - markdown-it instance
 */
export function injectSourceLineMapping(md) {
  if (md._mdpSourceLinePatched) {
    return
  }
  md._mdpSourceLinePatched = true

  const { rules } = md.renderer

  for (const name of BLOCK_OPEN_RULES) {
    const original = rules[name]
    rules[name] = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      if (token.map) {
        token.attrSet('data-line', String(token.map[0]))
      }
      if (typeof original === 'function') {
        return original(tokens, idx, options, env, self)
      }
      return self.renderToken(tokens, idx, options)
    }
  }

  const originalHr = rules.hr
  rules.hr = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.map) {
      token.attrSet('data-line', String(token.map[0]))
    }
    if (typeof originalHr === 'function') {
      return originalHr(tokens, idx, options, env, self)
    }
    return self.renderToken(tokens, idx, options)
  }

  const chainFence = rules.fence
  rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const inner =
      typeof chainFence === 'function'
        ? chainFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options)
    const line = token.map?.[0]
    if (line == null) {
      return inner
    }
    return `<div data-line="${line}" class="mdp-source-line">${inner}</div>\n`
  }

  const chainCodeBlock = rules.code_block
  rules.code_block = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const inner =
      typeof chainCodeBlock === 'function'
        ? chainCodeBlock(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options)
    const line = token.map?.[0]
    if (line == null) {
      return inner
    }
    return `<div data-line="${line}" class="mdp-source-line">${inner}</div>\n`
  }
}

export function createMarkdownEngine() {
  return {
    instance: createBaseEngine()
  }
}

export function renderMarkdown(markdown, { markdownEngine } = {}) {
  const source = normalizeLocalMarkdownLinkDestinations(markdown)
  const engine = markdownEngine?.instance || createBaseEngine()
  const html = engine.render(source)
  return { html }
}
