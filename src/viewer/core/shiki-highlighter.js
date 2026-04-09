import { createHighlighter } from 'shiki/bundle/web'
import { logger } from '../../shared/logger.js'
import {
  getShikiThemeIdForSettings,
  SHIKI_BUNDLED_THEME_IDS,
  SHIKI_LANG_IDS
} from './shiki-config.js'

const WHITESPACE_ONLY = /^\s*$/

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

export function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: SHIKI_BUNDLED_THEME_IDS,
      langs: SHIKI_LANG_IDS
    }).catch((error) => {
      highlighterPromise = null
      logger.error('Shiki highlighter failed to initialize.', error)
      throw error
    })
  }
  return highlighterPromise
}

/** Replace fenced `<pre><code class="language-…">` with Shiki HTML (in-browser `document`). */
export async function applyShikiToFencedCode(html, settings = {}) {
  if (typeof document === 'undefined') return html

  let highlighter
  try {
    highlighter = await getShikiHighlighter()
  } catch {
    return html
  }

  const theme = getShikiThemeIdForSettings(settings)
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html

  const fencedBlocks = []
  for (const code of wrapper.querySelectorAll('pre > code')) {
    const pre = code.parentElement
    if (!pre || pre.tagName !== 'PRE') continue
    const langMatch = String(code.className || '').match(/(?:^|\s)language-([\w-]+)/)
    if (!langMatch) continue
    const rawLang = langMatch[1]
    if (String(rawLang).toLowerCase() === 'mermaid') continue /* Mermaid plugin owns these fences */
    fencedBlocks.push({ pre, text: code.textContent ?? '', rawLang })
  }

  await Promise.all(
    fencedBlocks.map(async ({ pre, text, rawLang }) => {
      try {
        const out = await highlighter.codeToHtml(text, { lang: rawLang, theme })
        const tpl = document.createElement('template')
        tpl.innerHTML = out.trim()
        const nextPre = tpl.content.firstElementChild
        if (!nextPre) return
        if (nextPre.tagName === 'PRE') {
          nextPre.setAttribute('data-mdp-lang', rawLang)
          normalizeShikiPreWhitespace(nextPre)
        }
        pre.replaceWith(nextPre)
      } catch {
        /* unsupported grammar */
      }
    })
  )

  return wrapper.innerHTML
}
