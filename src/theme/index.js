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
  tableRowAltBg: '#f6f8fa',
  toastInfoBg: '#eff6ff',
  toastInfoText: '#1d4ed8',
  toastInfoBorder: '#bfdbfe',
  toastSuccessBg: '#ecfdf5',
  toastSuccessText: '#047857',
  toastSuccessBorder: '#a7f3d0',
  toastWarningBg: '#fffbeb',
  toastWarningText: '#92400e',
  toastWarningBorder: '#fde68a',
  toastErrorBg: '#fef2f2',
  toastErrorText: '#b91c1c',
  toastErrorBorder: '#fecaca'
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
  tableRowAltBg: '#161b22',
  toastInfoBg: '#0c2d6b',
  toastInfoText: '#bfdbfe',
  toastInfoBorder: '#1d4ed8',
  toastSuccessBg: '#063f2c',
  toastSuccessText: '#bbf7d0',
  toastSuccessBorder: '#047857',
  toastWarningBg: '#3b2a05',
  toastWarningText: '#fde68a',
  toastWarningBorder: '#b45309',
  toastErrorBg: '#450a0a',
  toastErrorText: '#fecaca',
  toastErrorBorder: '#b91c1c'
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
    '--mdp-table-row-alt-bg': colors.tableRowAltBg || colors.background,
    '--mdp-toast-info-bg': colors.toastInfoBg || colors.panelBg || colors.background,
    '--mdp-toast-info-text': colors.toastInfoText || colors.text,
    '--mdp-toast-info-border': colors.toastInfoBorder || colors.border || '#d0d7de',
    '--mdp-toast-success-bg': colors.toastSuccessBg || colors.panelBg || colors.background,
    '--mdp-toast-success-text': colors.toastSuccessText || colors.text,
    '--mdp-toast-success-border': colors.toastSuccessBorder || colors.border || '#d0d7de',
    '--mdp-toast-warning-bg': colors.toastWarningBg || colors.panelBg || colors.background,
    '--mdp-toast-warning-text': colors.toastWarningText || colors.text,
    '--mdp-toast-warning-border': colors.toastWarningBorder || colors.border || '#d0d7de',
    '--mdp-toast-error-bg': colors.toastErrorBg || colors.panelBg || colors.background,
    '--mdp-toast-error-text': colors.toastErrorText || colors.text,
    '--mdp-toast-error-border': colors.toastErrorBorder || colors.border || '#d0d7de'
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
