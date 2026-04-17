import { createHighlighter } from 'shiki/bundle/web'
import { logger } from '../../shared/logger.js'
import {
  getShikiThemeIdForSettings,
  SHIKI_BUNDLED_THEME_IDS,
  SHIKI_CORE_LANG_IDS,
  resolveShikiLangId
} from './shiki-config.js'

const WHITESPACE_ONLY = /^\s*$/
const FENCED_BLOCK_RE = /<pre\b([^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi
const CLASS_ATTR_RE = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i
const LANGUAGE_CLASS_RE = /(?:^|\s)language-([\w-]+)(?:\s|$)/i
const SHIKI_HIGHLIGHT_CONCURRENCY = 4

const HTML_NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0'
}

function stripWhitespaceOnlyDirectChildTextNodes(parent) {
  if (!parent) return
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE && WHITESPACE_ONLY.test(node.textContent ?? '')) {
      node.remove()
    }
  }
}

function normalizeShikiPreWhitespace(preEl) {
  if (!preEl || preEl.tagName !== 'PRE') return
  stripWhitespaceOnlyDirectChildTextNodes(preEl)
  const codeEl = preEl.querySelector(':scope > code')
  stripWhitespaceOnlyDirectChildTextNodes(codeEl)
}

let highlighterPromise = null
let loadedLangIds = new Set(SHIKI_CORE_LANG_IDS)
const langLoadPromises = new Map()

function decodeHtmlEntities(value) {
  const toCodePoint = (num, fallback) => {
    if (!Number.isFinite(num) || num < 0 || num > 0x10ffff) return fallback
    return String.fromCodePoint(num)
  }
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token) => {
    const raw = String(token || '').toLowerCase()
    if (raw.startsWith('#x')) {
      const cp = Number.parseInt(raw.slice(2), 16)
      return toCodePoint(cp, entity)
    }
    if (raw.startsWith('#')) {
      const cp = Number.parseInt(raw.slice(1), 10)
      return toCodePoint(cp, entity)
    }
    return HTML_NAMED_ENTITIES[raw] ?? entity
  })
}

function extractLanguageFromCodeAttrs(attrs) {
  const classMatch = String(attrs || '').match(CLASS_ATTR_RE)
  if (!classMatch) return null
  const classValue = classMatch[1] || classMatch[2] || ''
  const languageMatch = classValue.match(LANGUAGE_CLASS_RE)
  return languageMatch?.[1] || null
}

function addDataLangToShikiPre(html, langId) {
  if (!langId) return html
  if (/\bdata-mdp-lang=/.test(html)) return html
  return html.replace(/<pre\b/i, `<pre data-mdp-lang="${langId}"`)
}

function normalizeShikiPreWhitespaceHtml(html) {
  if (typeof document === 'undefined') return html
  const tpl = document.createElement('template')
  tpl.innerHTML = String(html || '').trim()
  const preEl = tpl.content.firstElementChild
  if (!preEl || preEl.tagName !== 'PRE') return html
  normalizeShikiPreWhitespace(preEl)
  return preEl.outerHTML
}

async function runWithConcurrency(tasks, concurrency) {
  if (!tasks.length) return
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async (_, workerIdx) => {
    for (let index = workerIdx; index < tasks.length; index += Math.min(concurrency, tasks.length)) {
      await tasks[index]()
    }
  })
  await Promise.all(workers)
}

async function ensureShikiLanguage(highlighter, rawLang) {
  const resolvedLangId = resolveShikiLangId(rawLang)
  if (!resolvedLangId) return null
  if (loadedLangIds.has(resolvedLangId)) return resolvedLangId

  if (!langLoadPromises.has(resolvedLangId)) {
    langLoadPromises.set(
      resolvedLangId,
      Promise.resolve(highlighter.loadLanguage(resolvedLangId))
        .then(() => {
          loadedLangIds.add(resolvedLangId)
          langLoadPromises.delete(resolvedLangId)
        })
        .catch((error) => {
          langLoadPromises.delete(resolvedLangId)
          throw error
        })
    )
  }

  try {
    await langLoadPromises.get(resolvedLangId)
    return resolvedLangId
  } catch (error) {
    logger.warn('Shiki language load failed.', { language: resolvedLangId, error })
    return null
  }
}

export function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: SHIKI_BUNDLED_THEME_IDS,
      langs: SHIKI_CORE_LANG_IDS
    }).catch((error) => {
      highlighterPromise = null
      loadedLangIds = new Set(SHIKI_CORE_LANG_IDS)
      langLoadPromises.clear()
      logger.error('Shiki highlighter failed to initialize.', error)
      throw error
    })
  }
  return highlighterPromise
}

/** Replace fenced `<pre><code class="language-…">` with Shiki HTML. */
export async function applyShikiToFencedCode(html, settings = {}) {
  let highlighter
  try {
    highlighter = await getShikiHighlighter()
  } catch {
    return html
  }

  const theme = getShikiThemeIdForSettings(settings)
  const source = String(html || '')
  const matches = []
  let match
  while ((match = FENCED_BLOCK_RE.exec(source)) !== null) {
    const codeAttrs = match[2] || ''
    const rawLang = extractLanguageFromCodeAttrs(codeAttrs)
    if (!rawLang) continue
    if (rawLang.toLowerCase() === 'mermaid') continue // Mermaid plugin owns these fences.

    const start = match.index
    const fullMatch = match[0]
    matches.push({
      start,
      end: start + fullMatch.length,
      fullMatch,
      rawLang,
      codeText: decodeHtmlEntities(match[3] || ''),
      replacement: null
    })
  }

  if (!matches.length) return source

  await runWithConcurrency(
    matches.map((block) => async () => {
      const langId = await ensureShikiLanguage(highlighter, block.rawLang)
      if (!langId) return
      try {
        const rendered = await highlighter.codeToHtml(block.codeText, {
          lang: langId,
          theme
        })
        const withLang = addDataLangToShikiPre(rendered.trim(), langId)
        block.replacement = normalizeShikiPreWhitespaceHtml(withLang)
      } catch {
        // Keep original fence block when highlighting fails for a single grammar.
      }
    }),
    SHIKI_HIGHLIGHT_CONCURRENCY
  )

  let output = ''
  let lastIndex = 0
  for (const block of matches) {
    output += source.slice(lastIndex, block.start)
    output += block.replacement || block.fullMatch
    lastIndex = block.end
  }
  output += source.slice(lastIndex)
  return output
}
