import { MERMAID_RENDERERS, PLUGIN_IDS } from '../../plugins/plugin-types.js'
import {
  attachMermaidActionsMenu,
  attachMermaidCopyButton,
  attachMermaidLightboxButton
} from '../../plugins/optional/mermaid-actions.js'
import { attachMermaidLightbox } from '../../plugins/optional/mermaid-lightbox.js'
import { logger } from '../../shared/logger.js'
import { getThemeColorsByPreset } from '../../theme/index.js'
import { setMermaidRenderError } from './mermaid-error-view.js'
import { sanitizeMermaidSvg } from './mermaid-sanitizer.js'

let mermaidImportPromise = null
let mermaidInitializePromise = null
let beautifulMermaidImportPromise = null
let mermaidRenderCounter = 0
let mermaidThemeKey = null

const GENERIC_FONT_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif',
  'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong'
])

function abortError() {
  return new DOMException('Mermaid render was aborted.', 'AbortError')
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError()
}

export function getMermaidThemeByPreset(preset) {
  return String(preset || '').toLowerCase() === 'dark' ? 'base' : 'default'
}

export function getMermaidThemeVariablesByPreset(preset) {
  if (String(preset || '').toLowerCase() !== 'dark') return undefined

  const colors = getThemeColorsByPreset('dark')
  return {
    darkMode: true,
    background: colors.background,
    primaryColor: colors.panelStrong,
    primaryTextColor: colors.text,
    primaryBorderColor: colors.borderStrong,
    secondaryColor: colors.linkSoft,
    secondaryTextColor: colors.text,
    secondaryBorderColor: colors.link,
    tertiaryColor: colors.accentSoft,
    tertiaryTextColor: colors.text,
    tertiaryBorderColor: colors.accent,
    mainBkg: colors.panelStrong,
    nodeBkg: colors.panelStrong,
    nodeBorder: colors.borderStrong,
    clusterBkg: colors.surface,
    clusterBorder: colors.borderStrong,
    lineColor: colors.muted,
    textColor: colors.text,
    titleColor: colors.heading,
    edgeLabelBackground: colors.background,
    noteBkgColor: colors.warningSoft,
    noteTextColor: colors.text,
    noteBorderColor: colors.warning
  }
}

function getMermaid() {
  if (!mermaidImportPromise) {
    mermaidImportPromise = import('mermaid/dist/mermaid.esm.min.mjs').then((module) => module.default)
  }
  return mermaidImportPromise
}

function getBeautifulMermaidRenderer() {
  if (!beautifulMermaidImportPromise) {
    beautifulMermaidImportPromise = import('beautiful-mermaid').then((module) => module.renderMermaidSVG)
  }
  return beautifulMermaidImportPromise
}

async function ensureMermaidInitialized(themeConfig) {
  const themeKey = JSON.stringify(themeConfig)
  if (mermaidThemeKey !== themeKey) {
    mermaidInitializePromise = null
    mermaidThemeKey = themeKey
  }
  if (!mermaidInitializePromise) {
    mermaidInitializePromise = getMermaid().then((mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        securityLevel: 'strict',
        ...themeConfig,
        htmlLabels: false
      })
      return mermaid
    })
  }
  return mermaidInitializePromise
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
    const full = raw.length === 3 ? [...raw].map((char) => char + char).join('') : raw
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16)
    }
  }
  const rgb = text.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (!rgb) return null
  return {
    r: Math.min(255, Number(rgb[1])),
    g: Math.min(255, Number(rgb[2])),
    b: Math.min(255, Number(rgb[3]))
  }
}

function toHexChannel(value) {
  return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')
}

function mixCssColors(base, accent, accentWeight, fallback) {
  const baseColor = parseCssColor(base)
  const accentColor = parseCssColor(accent)
  if (!baseColor || !accentColor) return fallback || base
  const weight = Math.min(1, Math.max(0, Number(accentWeight) || 0))
  return `#${toHexChannel(baseColor.r * (1 - weight) + accentColor.r * weight)}${toHexChannel(baseColor.g * (1 - weight) + accentColor.g * weight)}${toHexChannel(baseColor.b * (1 - weight) + accentColor.b * weight)}`
}

function getRelativeLuminance(colorValue) {
  const color = parseCssColor(colorValue)
  if (!color) return 1
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
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
    } else if (char === ',' && !quote) {
      families.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) families.push(current.trim())
  return families
}

function getPrimaryFontFamily(fontStack, fallback = 'system-ui') {
  for (const family of splitFontStack(fontStack)) {
    const normalized = family.replace(/^['"]|['"]$/g, '').trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (key === 'system-ui' || !GENERIC_FONT_FAMILIES.has(key)) return normalized
  }
  return fallback
}

function getBeautifulMermaidRenderOptions(node) {
  const themeRoot = node.closest?.('.mdp-root') || node
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

export function getMermaidRenderer(settings) {
  return settings?.plugins?.[PLUGIN_IDS.MERMAID]?.renderer === MERMAID_RENDERERS.BEAUTIFUL
    ? MERMAID_RENDERERS.BEAUTIFUL
    : MERMAID_RENDERERS.OFFICIAL
}

function finishRenderedNode(node, source, chartIndex, copyCodeWithToast) {
  const cleanups = [
    attachMermaidCopyButton(node, { source, copyCodeWithToast }),
    attachMermaidActionsMenu(node, { chartIndex }),
    attachMermaidLightboxButton(node),
    attachMermaidLightbox(node)
  ]
  return () => {
    for (const cleanup of cleanups) cleanup?.()
  }
}

export async function renderMermaidIntoNode({
  node,
  source,
  settings,
  chartIndex = 1,
  copyCodeWithToast,
  signal
}) {
  if (!node) throw new Error('Missing Mermaid render target.')
  throwIfAborted(signal)
  const rawSource = String(source ?? node.textContent ?? '')
  const code = rawSource.trim()
  node.classList.remove('mdp-mermaid--error')
  if (!code) {
    node.replaceChildren()
    node.setAttribute('data-mermaid-processed', 'true')
    return { cleanup() {} }
  }

  let cleanup = () => {}
  try {
    const renderer = getMermaidRenderer(settings)
    let svg
    if (renderer === MERMAID_RENDERERS.BEAUTIFUL) {
      const renderMermaidSVG = await getBeautifulMermaidRenderer()
      throwIfAborted(signal)
      svg = renderMermaidSVG(code, getBeautifulMermaidRenderOptions(node))
    } else {
      const themePreset = settings?.theme?.preset
      const mermaid = await ensureMermaidInitialized({
        theme: getMermaidThemeByPreset(themePreset),
        themeVariables: getMermaidThemeVariablesByPreset(themePreset)
      })
      throwIfAborted(signal)
      mermaidRenderCounter += 1
      svg = (await mermaid.render(`mdp-mermaid-${mermaidRenderCounter}`, code)).svg
    }
    throwIfAborted(signal)
    const safeSvg = sanitizeMermaidSvg(svg)
    if (!safeSvg.trim()) throw new Error('The Mermaid SVG could not be sanitized.')
    node.innerHTML = safeSvg
    cleanup = finishRenderedNode(node, rawSource, chartIndex, copyCodeWithToast)
  } catch (error) {
    if (error?.name === 'AbortError' || signal?.aborted) throw abortError()
    logger.warn('Mermaid diagram rendering failed.', {
      renderer: getMermaidRenderer(settings),
      message: error instanceof Error ? error.message : String(error)
    })
    setMermaidRenderError(node, rawSource, error)
    const copyCleanup = attachMermaidCopyButton(node, { source: rawSource, copyCodeWithToast })
    cleanup = () => copyCleanup?.()
  }
  node.setAttribute('data-mermaid-processed', 'true')
  return { cleanup }
}
