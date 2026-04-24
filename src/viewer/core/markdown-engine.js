import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'

function isExternalHref(href) {
  if (!href) return false
  const value = String(href).trimStart()
  return /^https?:/i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)
}

function isLikelyLocalLinkHref(href) {
  const value = String(href || '').trim()
  if (!value || !value.includes(' ')) return false
  if (value.startsWith('<') || value.startsWith('#')) return false
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return false
  return true
}

function looksLikeMarkdownLinkTitle(value) {
  if (!value) return false
  const trimmed = String(value).trim()
  if (trimmed.length < 2) return false
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return true
  }
  return trimmed.startsWith('(') && trimmed.endsWith(')')
}

function encodeLocalLinkSpaces(linkContent) {
  const value = String(linkContent || '')
  if (!isLikelyLocalLinkHref(value)) return value

  let hrefPart = value
  let titlePart = ''
  for (let i = value.length - 1; i >= 0; i -= 1) {
    if (!/\s/.test(value[i])) continue
    const suffix = value.slice(i).trimStart()
    if (!looksLikeMarkdownLinkTitle(suffix)) continue
    hrefPart = value.slice(0, i)
    titlePart = value.slice(i)
    break
  }

  if (!isLikelyLocalLinkHref(hrefPart)) return value
  return `${hrefPart.replace(/ /g, '%20')}${titlePart}`
}

function normalizeLocalMarkdownLinkDestinations(markdown) {
  const source = String(markdown || '')
  const lines = source.split('\n')
  let inFence = false
  let fenceMarker = ''

  return lines
    .map((line) => {
      const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/)
      if (fenceMatch) {
        const marker = fenceMatch[1]
        if (!inFence) {
          inFence = true
          fenceMarker = marker[0]
        } else if (marker[0] === fenceMarker) {
          inFence = false
          fenceMarker = ''
        }
        return line
      }
      if (inFence) return line

      let output = ''
      let codeSpanTicks = 0
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '`') {
          let tickRunLength = 1
          while (line[i + tickRunLength] === '`') tickRunLength += 1
          const tickRun = line.slice(i, i + tickRunLength)
          output += tickRun
          if (codeSpanTicks === 0) codeSpanTicks = tickRunLength
          else if (codeSpanTicks === tickRunLength) codeSpanTicks = 0
          i += tickRunLength - 1
          continue
        }
        if (codeSpanTicks > 0 || char !== ']' || line[i + 1] !== '(') {
          output += char
          continue
        }

        let cursor = i + 2
        let depth = 1
        while (cursor < line.length) {
          const current = line[cursor]
          if (current === '\\') {
            cursor += 2
            continue
          }
          if (current === '(') depth += 1
          else if (current === ')') {
            depth -= 1
            if (depth === 0) break
          }
          cursor += 1
        }
        if (depth !== 0) {
          output += char
          continue
        }

        const linkContent = line.slice(i + 2, cursor)
        output += `](${encodeLocalLinkSpaces(linkContent)})`
        i = cursor
      }
      return output
    })
    .join('\n')
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
