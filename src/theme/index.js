const LIGHT_THEME_COLORS = {
  background: '#ffffff',
  text: '#1f2328',
  heading: '#1f2328',
  border: '#d0d7de',
  muted: '#656d76',
  codeBg: '#f6f8fa',
  codeText: '#1f2328',
  panelBg: '#f6f8fa',
  link: '#0969da',
  tableBorder: '#d0d7de',
  tableHeaderBg: '#f6f8fa',
  tableRowAltBg: '#f6f8fa'
}

const DARK_THEME_COLORS = {
  background: '#0d1117',
  text: '#e6edf3',
  heading: '#e6edf3',
  border: '#30363d',
  muted: '#7d8590',
  codeBg: '#161b22',
  codeText: '#e6edf3',
  panelBg: '#161b22',
  link: '#2f81f7',
  tableBorder: '#30363d',
  tableHeaderBg: '#161b22',
  tableRowAltBg: '#161b22'
}

export const BUILT_IN_THEMES = {
  light: LIGHT_THEME_COLORS,
  dark: DARK_THEME_COLORS
}

export function getThemeColorsByPreset(preset) {
  const key = String(preset || '').toLowerCase()
  if (Object.prototype.hasOwnProperty.call(BUILT_IN_THEMES, key)) {
    return { ...BUILT_IN_THEMES[key] }
  }
  return { ...BUILT_IN_THEMES.light }
}

function toPx(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return `${fallback}px`
  return `${number}px`
}

function toLineHeight(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return String(fallback)
  return String(number)
}

export function createStyleVars(settings = {}) {
  const typography = settings?.typography || {}
  const layout = settings?.layout || {}
  const colors = getThemeColorsByPreset(String(settings?.theme?.preset || '').toLowerCase() || 'light')

  return {
    '--mdp-font-family': typography.fontFamily || 'system-ui',
    '--mdp-font-size': toPx(typography.fontSize, 16),
    '--mdp-line-height': toLineHeight(typography.lineHeight, 1.7),
    '--mdp-content-max-width': toPx(layout.contentMaxWidth, 980),
    '--mdp-toc-width': layout.showToc === false ? '0px' : toPx(layout.tocWidth, 280),
    '--mdp-bg': colors.background,
    '--mdp-text': colors.text,
    '--mdp-body-text': colors.text,
    '--mdp-heading': colors.heading,
    '--mdp-border': colors.border || colors.tableBorder || '#d0d7de',
    '--mdp-muted': colors.muted || '#57606a',
    '--mdp-code-bg': colors.codeBg,
    '--mdp-code-text': colors.codeText || colors.text,
    '--mdp-panel-bg': colors.panelBg || colors.background,
    '--mdp-link': colors.link,
    '--mdp-table-border': colors.tableBorder || colors.border || '#d0d7de',
    '--mdp-table-header-bg': colors.tableHeaderBg || colors.panelBg || colors.background,
    '--mdp-table-row-alt-bg': colors.tableRowAltBg || colors.background
  }
}

function applyCssVars(target, vars) {
  if (!target?.style) return
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value)
  }
}

export function applyThemeSettings(target, settings) {
  applyCssVars(target, createStyleVars(settings))
}
