const LIGHT_THEME_COLORS = {
  colorScheme: 'light',
  background: '#f6f8fb',
  surface: '#ffffff',
  text: '#172033',
  bodyText: '#273043',
  heading: '#111827',
  border: '#dce2ea',
  borderStrong: '#c5ced9',
  muted: '#667085',
  codeBg: '#f2f5f8',
  codeText: '#172033',
  panelBg: '#eef2f6',
  panelStrong: '#e3e9f0',
  link: '#2563eb',
  linkSoft: '#eaf2ff',
  accent: '#16815c',
  accentSoft: '#e8f6ef',
  warning: '#b35c00',
  warningSoft: '#fff3dc',
  danger: '#c2413a',
  tableBorder: '#dce2ea',
  tableHeaderBg: '#f2f5f8',
  tableRowAltBg: '#fafbfc',
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
  colorScheme: 'dark',
  background: '#0d121b',
  surface: '#151b26',
  text: '#edf2f7',
  bodyText: '#dce4ee',
  heading: '#f8fafc',
  border: '#2d3848',
  borderStrong: '#465469',
  muted: '#9ba9bb',
  codeBg: '#0b111a',
  codeText: '#e6edf3',
  panelBg: '#101722',
  panelStrong: '#1d2735',
  link: '#7ab7ff',
  linkSoft: '#122b4d',
  accent: '#56d39a',
  accentSoft: '#123529',
  warning: '#f4b24e',
  warningSoft: '#3b2a0e',
  danger: '#ff8d85',
  tableBorder: '#2d3848',
  tableHeaderBg: '#1a2330',
  tableRowAltBg: '#111925',
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

// Keep the floating quick-toggle intentionally narrower than the full theme
// registry so future presets do not silently become part of its cycle.
const LIGHT_DARK_THEME_TARGETS = Object.freeze({ light: 'dark', dark: 'light' })

export function getLightDarkThemeToggleTarget(preset) {
  const normalizedPreset = String(preset || '').toLowerCase()
  return Object.hasOwn(LIGHT_DARK_THEME_TARGETS, normalizedPreset)
    ? LIGHT_DARK_THEME_TARGETS[normalizedPreset]
    : null
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
    '--mdp-color-scheme': colors.colorScheme || 'light',
    '--mdp-font-family': typography.fontFamily || 'system-ui',
    '--mdp-font-size': toPx(typography.fontSize, 16),
    '--mdp-line-height': toLineHeight(typography.lineHeight, 1.7),
    '--mdp-content-max-width': toPx(layout.contentMaxWidth, 980),
    '--mdp-toc-width': layout.showToc === false ? '0px' : toPx(layout.tocWidth, 280),
    '--mdp-bg': colors.background,
    '--mdp-surface': colors.surface || colors.background,
    '--mdp-text': colors.text,
    '--mdp-body-text': colors.bodyText || colors.text,
    '--mdp-heading': colors.heading,
    '--mdp-border': colors.border || colors.tableBorder || '#d0d7de',
    '--mdp-border-strong': colors.borderStrong || colors.border || '#d0d7de',
    '--mdp-muted': colors.muted || '#57606a',
    '--mdp-code-bg': colors.codeBg,
    '--mdp-code-text': colors.codeText || colors.text,
    '--mdp-panel-bg': colors.panelBg || colors.background,
    '--mdp-panel-strong': colors.panelStrong || colors.panelBg || colors.background,
    '--mdp-link': colors.link,
    '--mdp-link-soft': colors.linkSoft || colors.panelBg || colors.background,
    '--mdp-accent': colors.accent || colors.link,
    '--mdp-accent-soft': colors.accentSoft || colors.panelBg || colors.background,
    '--mdp-warning': colors.warning || colors.toastWarningText || colors.text,
    '--mdp-warning-soft': colors.warningSoft || colors.toastWarningBg || colors.background,
    '--mdp-danger': colors.danger || colors.toastErrorText || colors.text,
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
