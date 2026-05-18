import { applyThemeSettings } from '../../theme/index.js'
import { getSidebarWidthPx } from '../explorer/explorer-state.js'
import { EDITOR_LINE_HEIGHT, normalizeEditorSettings } from '../../shared/constants/editor.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../../shared/constants/viewer.js'

export function clampSidebarWidth(widthPx) {
  const width = Number(widthPx)
  if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
}

export function createStyleElement(cssText) {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

/**
 * Re-apply sidebar width after theme (which sets `--mdp-toc-width` from settings) so session
 * drag width wins — same resolution as `useSidebarResize`.
 * @param {HTMLElement | ShadowRoot} themeTarget
 * @param {object} settings
 */
export function applySidebarWidthPreference(themeTarget, settings) {
  if (!themeTarget?.style) return
  const layout = settings?.layout || {}
  const storedWidth = getSidebarWidthPx()
  const layoutWidth = Number(layout.tocWidth)
  const baseWidth = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
  const width = clampSidebarWidth(Number.isFinite(baseWidth) ? baseWidth : 280)
  themeTarget.style.setProperty('--mdp-toc-width', `${width}px`)
}

/**
 * @param {HTMLElement | null} article
 * @param {object} settings
 */
export function applyEditModeOverrides(article, settings) {
  if (!article) return
  const editorSettings = normalizeEditorSettings(settings?.editor)
  article.style.fontSize = `${editorSettings.fontSize}px`
  article.style.lineHeight = String(EDITOR_LINE_HEIGHT)
}

/**
 * @param {object} options
 * @param {HTMLElement | null} options.article
 * @param {HTMLElement | ShadowRoot | null} options.root
 * @param {HTMLElement | ShadowRoot} options.container
 * @param {object} options.settings
 * @param {boolean} options.editModeActive
 */
export function applyReaderStyles({ article, root, container, settings, editModeActive }) {
  if (!article) return

  const typo = settings?.typography || {}
  const layout = settings?.layout || {}
  const themeTarget = root || container?.host || container

  applyThemeSettings(themeTarget, settings)
  applySidebarWidthPreference(themeTarget, settings)

  if (typo.fontFamily) article.style.fontFamily = 'var(--mdp-font-family)'
  if (editModeActive) {
    applyEditModeOverrides(article, settings)
  } else {
    if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
    if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
  }
  if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'
}
