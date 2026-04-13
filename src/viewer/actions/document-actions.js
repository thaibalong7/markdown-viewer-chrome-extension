import { sanitizeDownloadFilename, triggerDownload } from '../../shared/download.js'
import { MDP_WS_FILE } from '../../shared/constants/explorer.js'
import { createStyleVars } from '../../theme/index.js'

/** KaTeX CSS from CDN so exported files hide MathML duplicate / render math like the viewer (offline export would need bundled fonts). */
const EXPORT_KATEX_CDN_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.44/dist/katex.min.css'

/**
 * Minimal markdown-body styles for standalone HTML / Word HTML export (no extension CSS bundle).
 *
 * Intentionally mirrors `src/viewer/styles/content/*.scss` (typography, code, tables, plugins, mermaid).
 * Standalone exports cannot load the Shadow DOM SCSS bundle; keep this string aligned when changing
 * on-screen article styles. Theme colors come from `createStyleVars()` inlined as `:root` above this block.
 */
const EXPORT_MARKDOWN_BODY_CSS = `
.mdp-markdown-body { max-width: var(--mdp-content-max-width); margin: 0 auto; line-height: var(--mdp-line-height); font-size: var(--mdp-font-size); color: var(--mdp-body-text); word-wrap: break-word; }
.mdp-markdown-body h1,.mdp-markdown-body h2,.mdp-markdown-body h3,.mdp-markdown-body h4,.mdp-markdown-body h5,.mdp-markdown-body h6 { color: var(--mdp-heading); margin: 1.2em 0 0.5em; font-weight: 600; line-height: 1.25; }
.mdp-markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--mdp-border); padding-bottom: 0.25em; }
.mdp-markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--mdp-border); padding-bottom: 0.2em; }
.mdp-markdown-body h3 { font-size: 1.25em; }
.mdp-markdown-body p { margin: 0 0 1em; }
.mdp-markdown-body a { color: var(--mdp-link); }
.mdp-markdown-body ul,.mdp-markdown-body ol { margin: 0 0 1em; padding-left: 1.5em; }
.mdp-markdown-body blockquote { margin: 0 0 1em; padding: 0 1em; border-left: 4px solid var(--mdp-border); color: var(--mdp-muted); }
.mdp-markdown-body pre { margin: 0 0 1em; padding: var(--mdp-code-padding, 12px); overflow: auto; border-radius: 8px; border: 1px solid var(--mdp-border); background: var(--mdp-code-bg); color: var(--mdp-code-text); font-size: 0.875em; line-height: 1.42; white-space: pre; tab-size: 4; word-break: normal; }
.mdp-markdown-body :is(p, td, th, blockquote, h1, h2, h3, h4, h5, h6) code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--mdp-code-bg); color: var(--mdp-code-text); padding: 0.15em 0.4em; border-radius: 6px; font-size: 0.875em; }
.mdp-markdown-body li > code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--mdp-code-bg); color: var(--mdp-code-text); padding: 0.15em 0.4em; border-radius: 6px; font-size: 0.875em; }
.mdp-markdown-body pre > code { display: block; background: transparent; padding: 0; border-radius: 0; font-size: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: inherit; white-space: pre; tab-size: 4; line-height: 1.42; }
.mdp-markdown-body pre.shiki code .line { display: block; margin: 0; padding: 0; }
.mdp-markdown-body pre:not(.shiki) > code { display: block; white-space: pre; tab-size: 4; }
.mdp-markdown-body table { border-collapse: collapse; width: 100%; margin: 0 0 1em; font-size: 0.95em; }
.mdp-markdown-body th,.mdp-markdown-body td { border: 1px solid var(--mdp-table-border); padding: 8px 12px; }
.mdp-markdown-body th { background: var(--mdp-table-header-bg); font-weight: 600; }
.mdp-markdown-body tr:nth-child(even) { background: var(--mdp-table-row-alt-bg); }
.mdp-markdown-body img { max-width: 100%; height: auto; }
.mdp-markdown-body hr { border: 0; border-top: 1px solid var(--mdp-border); margin: 1.5em 0; }
.mdp-markdown-body .table-wrapper { overflow-x: auto; margin: 0 0 1em; }
.mdp-markdown-body ul:has(> li.mdp-task-list__item), .mdp-markdown-body ol:has(> li.mdp-task-list__item) { list-style: none; list-style-type: none; padding-left: 0; margin-left: 0; }
.mdp-markdown-body li.mdp-task-list__item { list-style: none; list-style-type: none; margin: 0.2em 0; }
.mdp-markdown-body li.mdp-task-list__item::marker { content: none; }
.mdp-markdown-body .mdp-task-list__checkbox { margin-right: 8px; vertical-align: middle; }
.mdp-markdown-body li.mdp-task-list__item > ul, .mdp-markdown-body li.mdp-task-list__item > ol { margin: 0.35em 0 0; padding-left: 1.5em; list-style: none; list-style-type: none; }
.mdp-markdown-body .mdp-mermaid { position: relative; margin: 1em 0; padding: 16px; border-radius: 8px; border: 1px solid var(--mdp-border); background: var(--mdp-bg); overflow-x: auto; display: flex; justify-content: center; align-items: flex-start; }
.mdp-markdown-body .mdp-mermaid > svg { display: block; width: auto; max-width: 100%; height: auto; margin: 0 auto; }
.mdp-markdown-body .mdp-mermaid--error { flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 10px; }
.mdp-markdown-body .katex-display, .mdp-markdown-body p.katex-block { margin: 0.45em 0; overflow-x: auto; overflow-y: hidden; }
.mdp-markdown-body .katex-error { color: var(--mdp-muted); }
`

function styleVarsToCssBlock(vars) {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${String(v).replace(/;/g, '')};`)
  return `:root {\n${lines.join('\n')}\n}`
}

/**
 * @param {string | null | undefined} fileUrl
 * @param {string} extension - without dot
 * @returns {string}
 */
export function buildExportFilename(fileUrl, extension) {
  const ext = String(extension || 'html').replace(/^\./, '')
  let base = 'document'

  if (fileUrl && typeof fileUrl === 'string') {
    if (fileUrl.startsWith(MDP_WS_FILE)) {
      try {
        const rel = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
        const leaf = rel.split('/').filter(Boolean).pop() || ''
        base = leaf.replace(/\.(md|markdown|mdown)$/i, '') || base
      } catch {
        /* keep base */
      }
    } else {
      try {
        const u = new URL(fileUrl)
        const leaf = u.pathname.split('/').filter(Boolean).pop() || ''
        base = decodeURIComponent(leaf).replace(/\.(md|markdown|mdown)$/i, '') || base
      } catch {
        /* keep base */
      }
    }
  }

  const safe = sanitizeDownloadFilename(base.trim())
  return `${safe}.${ext}`
}

/**
 * Deep-clone the rendered article and strip viewer-only UI (code meta, Mermaid toolbars,
 * portaled menus, heading permalink anchors) so HTML/Word export matches on-screen content.
 * @param {HTMLElement} articleEl
 * @returns {HTMLElement}
 */
function cloneArticleForExport(articleEl) {
  const clone = articleEl.cloneNode(true)
  if (!(clone instanceof HTMLElement)) {
    const fallback = document.createElement('article')
    fallback.className = 'mdp-markdown-body'
    return fallback
  }

  for (const block of [...clone.querySelectorAll('.mdp-code-block')]) {
    const pre = block.querySelector(':scope > pre')
    if (pre instanceof HTMLPreElement) {
      block.replaceWith(pre)
    } else {
      block.remove()
    }
  }

  clone
    .querySelectorAll('.mdp-mermaid-toolbar, .mdp-mermaid-actions, .mdp-mermaid-actions__menu, a.mdp-heading-anchor')
    .forEach((el) => el.remove())

  // `innerHTML` only serializes attributes, not live JS properties. Task list uses
  // `input.checked = …` without `setAttribute('checked')`, so export must mirror the
  // checked state into markup or reopened HTML shows every box unchecked.
  for (const input of clone.querySelectorAll('input[type="checkbox"]')) {
    if (!(input instanceof HTMLInputElement)) continue
    if (input.checked) input.setAttribute('checked', '')
    else input.removeAttribute('checked')
  }

  return clone
}

/**
 * @param {HTMLElement} articleEl
 * @param {object} settings
 * @param {string} [titleHint] - page `<title>` (e.g. basename without extension)
 * @returns {string}
 */
function buildStandaloneHtmlDocument(articleEl, settings, titleHint) {
  const vars = createStyleVars(settings || {})
  const varsBlock = styleVarsToCssBlock(vars)
  const title = sanitizeDownloadFilename(String(titleHint || 'Export').trim())
  const exportRoot = cloneArticleForExport(articleEl)
  const bodyInner = exportRoot.innerHTML
  const needsKatex = Boolean(exportRoot.querySelector('.katex'))
  const katexLink = needsKatex
    ? `  <link rel="stylesheet" href="${escapeHtmlText(EXPORT_KATEX_CDN_CSS)}" crossorigin>\n`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtmlText(title)}</title>
${katexLink}  <style>
${varsBlock}
${EXPORT_MARKDOWN_BODY_CSS}
body { margin: 0; padding: 24px; font-family: var(--mdp-font-family); background: var(--mdp-bg); color: var(--mdp-text); }
  </style>
</head>
<body>
<article class="mdp-markdown-body">${bodyInner}</article>
</body>
</html>`
}

/**
 * @param {string} text
 */
function escapeHtmlText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printDocument() {
  window.print()
}

/**
 * @param {HTMLElement} articleEl
 * @param {object} settings
 * @param {string} filename
 */
export async function exportAsHtml(articleEl, settings, filename) {
  const titleHint = filename.replace(/\.html?$/i, '')
  const html = buildStandaloneHtmlDocument(articleEl, settings, titleHint)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  await triggerDownload({ blob, filename })
}

/**
 * @param {HTMLElement} articleEl
 * @param {object} settings
 * @param {string} filename
 */
export async function exportAsWord(articleEl, settings, filename) {
  const titleHint = filename.replace(/\.doc$/i, '')
  const html = buildStandaloneHtmlDocument(articleEl, settings, titleHint)
  // UTF-8 BOM + HTML as MS Word HTML helps Word/LibreOffice open the file.
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  await triggerDownload({ blob, filename })
}
