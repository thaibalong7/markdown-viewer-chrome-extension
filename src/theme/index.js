const LIGHT_THEME_COLORS = {
  background: '#ffffff',
  text: '#1f2328',
  heading: '#1f2328',
  border: '#d0d7de',
  muted: '#57606a',
  codeBg: '#f6f8fa',
  codeText: '#1f2328',
  panelBg: '#f6f8fa',
  link: '#0969da',
  tableBorder: '#d0d7de',
  tableHeaderBg: '#f6f8fa',
  tableRowAltBg: '#f8fafc'
}

const DARK_THEME_COLORS = {
  background: '#0d1117',
  text: '#c9d1d9',
  heading: '#f0f6fc',
  border: '#30363d',
  muted: '#8b949e',
  codeBg: '#161b22',
  codeText: '#c9d1d9',
  panelBg: '#111827',
  link: '#58a6ff',
  tableBorder: '#30363d',
  tableHeaderBg: '#111827',
  tableRowAltBg: '#0f172a'
}

const VSCODE_DARK_PLUS_THEME_COLORS = {
  background: '#1e1e1e',
  text: '#d4d4d4',
  heading: '#ffffff',
  border: '#3c3c3c',
  muted: '#a0a0a0',
  codeBg: '#252526',
  codeText: '#ce9178',
  panelBg: '#252526',
  link: '#4fc1ff',
  tableBorder: '#3c3c3c',
  tableHeaderBg: '#2d2d2d',
  tableRowAltBg: '#242424'
}

const VSCODE_LIGHT_PLUS_THEME_COLORS = {
  background: '#ffffff',
  text: '#333333',
  heading: '#1f1f1f',
  border: '#e0e0e0',
  muted: '#666666',
  codeBg: '#f3f3f3',
  codeText: '#a31515',
  panelBg: '#f8f8f8',
  link: '#006ab1',
  tableBorder: '#e0e0e0',
  tableHeaderBg: '#f2f2f2',
  tableRowAltBg: '#fafafa'
}

export const BUILT_IN_THEMES = {
  light: LIGHT_THEME_COLORS,
  dark: DARK_THEME_COLORS,
  'vscode-dark-plus': VSCODE_DARK_PLUS_THEME_COLORS,
  'vscode-light-plus': VSCODE_LIGHT_PLUS_THEME_COLORS
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
