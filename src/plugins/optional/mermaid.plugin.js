import DOMPurify from 'dompurify'
import { MERMAID_RENDERERS, PLUGIN_IDS } from '../plugin-types.js'
import { logger } from '../../shared/logger.js'
import {
  attachMermaidActionsMenu,
  attachMermaidCopyButton,
  attachMermaidLightboxButton
} from './mermaid-actions.js'
import { attachMermaidLightbox } from './mermaid-lightbox.js'

let mermaidImportPromise = null
let mermaidInitializePromise = null
let beautifulMermaidImportPromise = null
let mermaidRenderCounter = 0
let mermaidThemeKey = null
let activeRenderObserver = null
const createPurifier = typeof DOMPurify === 'function' ? DOMPurify : null
const windowRef = typeof window !== 'undefined' ? window : null
const svgPurifier = createPurifier && windowRef ? createPurifier(windowRef) : null
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong'
])

function getMermaidThemeByPreset(preset) {
  const key = String(preset || '').toLowerCase()
  if (key === 'dark') return 'dark'
  return 'default'
}

function getMermaid() {
  if (!mermaidImportPromise) {
    mermaidImportPromise = import('mermaid/dist/mermaid.esm.min.mjs').then((m) => m.default)
  }
  return mermaidImportPromise
}

function getBeautifulMermaidRenderer() {
  if (!beautifulMermaidImportPromise) {
    beautifulMermaidImportPromise = import('beautiful-mermaid').then(
      (module) => module.renderMermaidSVG
    )
  }
  return beautifulMermaidImportPromise
}

function ensureMermaidInitialized(theme) {
  if (mermaidThemeKey !== theme) {
    mermaidInitializePromise = null
    mermaidThemeKey = theme
  }

  if (!mermaidInitializePromise) {
    mermaidInitializePromise = getMermaid().then((mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'strict',
        theme
      })
      return mermaid
    })
  }
  return mermaidInitializePromise
}

function isMermaidFenceClass(className) {
  return /\blanguage-mermaid\b/i.test(String(className || ''))
}

function sanitizeMermaidSvg(svg) {
  const rawSvg = String(svg || '')
    .replace(/@import\s+url\([^)]*\);\s*/gi, '')
    .replace(/url\(\s*['"]?(?:https?:)?\/\/[^)]*?\)/gi, '')
  if (!svgPurifier) return rawSvg
  return svgPurifier.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style', 'class', 'role', 'aria-label', 'tabindex']
  })
}

function getCssVar(element, name, fallback) {
  if (typeof getComputedStyle !== 'function') return fallback
  const value = getComputedStyle(element).getPropertyValue(name).trim()
  return value || fallback
}

function parseCssColor(value) {
  const text = String(value || '').trim()
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1]
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((char) => char + char)
            .join('')
        : raw
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16)
    }
  }

  const rgb = text.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (rgb) {
    return {
      r: Math.min(255, Number(rgb[1])),
      g: Math.min(255, Number(rgb[2])),
      b: Math.min(255, Number(rgb[3]))
    }
  }

  return null
}

function toHexChannel(value) {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0')
}

function toHexColor(color) {
  return `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`
}

function mixCssColors(base, accent, accentWeight, fallback) {
  const baseColor = parseCssColor(base)
  const accentColor = parseCssColor(accent)
  if (!baseColor || !accentColor) return fallback || base
  const weight = Math.min(1, Math.max(0, Number(accentWeight) || 0))
  return toHexColor({
    r: baseColor.r * (1 - weight) + accentColor.r * weight,
    g: baseColor.g * (1 - weight) + accentColor.g * weight,
    b: baseColor.b * (1 - weight) + accentColor.b * weight
  })
}

function getRelativeLuminance(colorValue) {
  const color = parseCssColor(colorValue)
  if (!color) return 1
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function splitFontStack(fontStack) {
  const families = []
  let current = ''
  let quote = ''

  for (const char of String(fontStack || '')) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char
      current += char
      continue
    }
    if (char === ',' && !quote) {
      families.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) families.push(current.trim())
  return families
}

function getPrimaryFontFamily(fontStack, fallback = 'system-ui') {
  for (const family of splitFontStack(fontStack)) {
    const normalized = family.replace(/^['"]|['"]$/g, '').trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (key === 'system-ui') return normalized
    if (GENERIC_FONT_FAMILIES.has(key)) continue
    return normalized
  }
  return fallback
}

function getBeautifulMermaidRenderOptions(node) {
  const themeRoot = node.closest('.mdp-root') || node
  const fontStack = getCssVar(themeRoot, '--mdp-font-family', 'system-ui')
  const bg = getCssVar(themeRoot, '--mdp-bg', '#ffffff')
  const fg = getCssVar(themeRoot, '--mdp-text', '#1f2328')
  const border = getCssVar(themeRoot, '--mdp-border', '#d0d7de')
  const accent = getCssVar(themeRoot, '--mdp-link', '#0969da')
  const muted = getCssVar(themeRoot, '--mdp-muted', '#656d76')
  const panelBg = getCssVar(themeRoot, '--mdp-panel-bg', '#f6f8fa')
  const isDark = getRelativeLuminance(bg) < 0.45

  return {
    transparent: true,
    font: getPrimaryFontFamily(fontStack),
    bg,
    fg,
    line: mixCssColors(border, fg, isDark ? 0.28 : 0.16, border),
    accent,
    muted: mixCssColors(muted, accent, isDark ? 0.12 : 0.08, muted),
    surface: mixCssColors(panelBg, accent, isDark ? 0.14 : 0.07, panelBg),
    border: mixCssColors(border, accent, isDark ? 0.32 : 0.22, border)
  }
}

function getMermaidRenderer(settings) {
  const renderer = settings?.plugins?.[PLUGIN_IDS.MERMAID]?.renderer
  if (renderer === MERMAID_RENDERERS.BEAUTIFUL) return MERMAID_RENDERERS.BEAUTIFUL
  return MERMAID_RENDERERS.OFFICIAL
}

/** Human-readable text from Mermaid/render failures (safe for `textContent`). */
function formatMermaidRenderError(error) {
  if (error == null) return 'Unknown error.'
  const msg = typeof error.message === 'string' ? error.message.trim() : ''
  const str = typeof error.str === 'string' ? error.str.trim() : ''
  if (msg && str && str !== msg) return `${msg}\n\n${str}`
  if (msg) return msg
  if (str) return str
  try {
    return String(error)
  } catch {
    return 'Unknown error.'
  }
}

/** Replace node contents with parse/render error (copy-friendly) + original source. */
function setMermaidRenderError(node, code, error) {
  if (!node) return
  node.classList.add('mdp-mermaid--error')
  node.replaceChildren()

  const banner = document.createElement('div')
  banner.className = 'mdp-mermaid__error-banner'

  const title = document.createElement('div')
  title.className = 'mdp-mermaid__error-title'
  title.textContent = 'Mermaid render error'

  const message = document.createElement('pre')
  message.className = 'mdp-mermaid__error-message'
  message.setAttribute('role', 'alert')
  message.textContent = formatMermaidRenderError(error)

  banner.append(title, message)

  const sourceTitle = document.createElement('div')
  sourceTitle.className = 'mdp-mermaid__source-title'
  sourceTitle.textContent = 'Diagram source'

  const source = document.createElement('pre')
  source.className = 'mdp-mermaid__source'
  source.textContent = code

  node.append(banner, sourceTitle, source)
}

/** ```mermaid``` still as `<pre>` (incl. inside `.mdp-code-block`) → `.mdp-mermaid` text container. */
function hoistMermaidPresToDivs(articleEl) {
  for (const block of [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-code-block')]) {
    const pre = block.querySelector(':scope > pre')
    const code = pre?.querySelector(':scope > code')
    if (!code || !isMermaidFenceClass(code.className)) continue
    const div = document.createElement('div')
    div.className = 'mdp-mermaid'
    div.textContent = String(code.textContent ?? '').trimEnd()
    block.replaceWith(div)
  }

  for (const code of [...articleEl.querySelectorAll('.mdp-markdown-body pre > code')]) {
    if (!isMermaidFenceClass(code.className)) continue
    const pre = code.parentElement
    if (!(pre instanceof HTMLPreElement)) continue
    if (pre.parentElement?.classList.contains('mdp-code-block')) continue
    const div = document.createElement('div')
    div.className = 'mdp-mermaid'
    div.textContent = String(code.textContent ?? '').trimEnd()
    pre.replaceWith(div)
  }
}

function disconnectMermaidObserver() {
  if (!activeRenderObserver) return
  activeRenderObserver.disconnect()
  activeRenderObserver = null
}

function finishRenderedMermaidNode(node, code, chartIndex, copyCodeWithToast) {
  attachMermaidCopyButton(node, { source: code, copyCodeWithToast })
  attachMermaidActionsMenu(node, { chartIndex })
  attachMermaidLightboxButton(node)
  attachMermaidLightbox(node)
}

async function renderOfficialMermaidNode({ node, mermaidApi, chartIndex, copyCodeWithToast }) {
  const source = node.textContent || ''
  const code = String(source).trim()
  if (!code) {
    node.setAttribute('data-mermaid-processed', 'true')
    return
  }

  try {
    mermaidRenderCounter += 1
    const id = `mdp-mermaid-${mermaidRenderCounter}`
    const out = await mermaidApi.render(id, code)
    node.innerHTML = out.svg
    finishRenderedMermaidNode(node, code, chartIndex, copyCodeWithToast)
  } catch (error) {
    logger.warn('Mermaid block rendering failed.', error)
    setMermaidRenderError(node, code, error)
    attachMermaidCopyButton(node, { source: code, copyCodeWithToast })
  }
  node.setAttribute('data-mermaid-processed', 'true')
}

async function renderBeautifulMermaidNode({
  node,
  renderMermaidSVG,
  chartIndex,
  copyCodeWithToast
}) {
  const source = node.textContent || ''
  const code = String(source).trim()
  if (!code) {
    node.setAttribute('data-mermaid-processed', 'true')
    return
  }

  try {
    const svg = renderMermaidSVG(code, getBeautifulMermaidRenderOptions(node))
    node.innerHTML = sanitizeMermaidSvg(svg)
    finishRenderedMermaidNode(node, code, chartIndex, copyCodeWithToast)
  } catch (error) {
    logger.warn('Beautiful Mermaid block rendering failed.', error)
    setMermaidRenderError(node, code, error)
    attachMermaidCopyButton(node, { source: code, copyCodeWithToast })
  }
  node.setAttribute('data-mermaid-processed', 'true')
}

export const mermaidPlugin = {
  id: PLUGIN_IDS.MERMAID,
  extendMarkdown({ markdownEngine }) {
    const md = markdownEngine.instance
    const defaultFence = md.renderer.rules.fence
    if (typeof defaultFence !== 'function') return

    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const rawInfo = token.info ? String(token.info).trim() : ''
      const lang = rawInfo.split(/\s+/)[0] || ''
      if (String(lang).toLowerCase() === 'mermaid') {
        const content = token.content.trimEnd()
        return `<div class="mdp-mermaid">${md.utils.escapeHtml(content)}</div>\n`
      }
      return defaultFence(tokens, idx, options, env, self)
    }
  },
  async afterRender({ articleEl, settings, copyCodeWithToast }) {
    if (!articleEl) return
    disconnectMermaidObserver()

    hoistMermaidPresToDivs(articleEl)

    const nodes = articleEl.querySelectorAll('.mdp-mermaid:not([data-mermaid-processed="true"])')
    if (!nodes.length) return

    const renderer = getMermaidRenderer(settings)
    let mermaidApi = null
    let renderMermaidSVG = null
    try {
      if (renderer === MERMAID_RENDERERS.BEAUTIFUL) {
        renderMermaidSVG = await getBeautifulMermaidRenderer()
      } else {
        const mermaidTheme = getMermaidThemeByPreset(settings?.theme?.preset)
        mermaidApi = await ensureMermaidInitialized(mermaidTheme)
      }
    } catch (error) {
      logger.warn('Mermaid renderer initialization failed.', error)
      return
    }

    const allCharts = [...articleEl.querySelectorAll('.mdp-markdown-body .mdp-mermaid')]
    const chartIndexByNode = new Map(allCharts.map((node, idx) => [node, idx + 1]))

    if (typeof IntersectionObserver !== 'function') {
      for (const node of nodes) {
        const renderArgs = {
          node,
          chartIndex: Math.max(1, chartIndexByNode.get(node) || 1),
          copyCodeWithToast
        }
        if (renderer === MERMAID_RENDERERS.BEAUTIFUL) {
          await renderBeautifulMermaidNode({ ...renderArgs, renderMermaidSVG })
        } else {
          await renderOfficialMermaidNode({ ...renderArgs, mermaidApi })
        }
      }
      return
    }

    const observerRoot = articleEl.closest('.mdp-root') || null
    activeRenderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const node = entry.target
          activeRenderObserver?.unobserve(node)
          const renderArgs = {
            node,
            chartIndex: Math.max(1, chartIndexByNode.get(node) || 1),
            copyCodeWithToast
          }
          if (renderer === MERMAID_RENDERERS.BEAUTIFUL) {
            void renderBeautifulMermaidNode({ ...renderArgs, renderMermaidSVG })
          } else {
            void renderOfficialMermaidNode({ ...renderArgs, mermaidApi })
          }
        }
      },
      {
        root: observerRoot,
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    )

    for (const node of nodes) {
      activeRenderObserver.observe(node)
    }
  }
}
