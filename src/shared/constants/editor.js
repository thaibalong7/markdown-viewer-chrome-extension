export const DEFAULT_EDITOR_FONT_SIZE_PX = 14
export const DEFAULT_EDITOR_TAB_SIZE = 2
export const DEFAULT_EDITOR_WORD_WRAP = true
export const DEFAULT_EDITOR_LINE_NUMBERS = true
export const DEFAULT_EDITOR_ENABLED = false
export const EDITOR_LINE_HEIGHT = 1.5
/** Matches `.cm-gutters` minWidth — status bar left padding aligns with this. */
export const EDITOR_GUTTER_MIN_WIDTH_PX = 40
/** Fine-pointer controls inside transient editor toolbars stay denser than page forms. */
export const EDITOR_TOOLBAR_CONTROL_HEIGHT_PX = 28
/** Coarse pointers keep an accessible target even when the visual toolbar is compact on desktop. */
export const EDITOR_TOOLBAR_TOUCH_TARGET_PX = 44

export const DEFAULT_EDITOR_SETTINGS = {
  enabled: DEFAULT_EDITOR_ENABLED,
  fontSize: DEFAULT_EDITOR_FONT_SIZE_PX,
  tabSize: DEFAULT_EDITOR_TAB_SIZE,
  wordWrap: DEFAULT_EDITOR_WORD_WRAP,
  lineNumbers: DEFAULT_EDITOR_LINE_NUMBERS
}

export function normalizeEditorSettings(settings = {}) {
  const fontSize = Number(settings.fontSize)
  const tabSize = Number(settings.tabSize)

  return {
    enabled: settings.enabled === true,
    fontSize: Number.isFinite(fontSize)
      ? Math.max(12, Math.min(24, Math.round(fontSize)))
      : DEFAULT_EDITOR_FONT_SIZE_PX,
    tabSize: Number.isFinite(tabSize)
      ? Math.max(2, Math.min(8, Math.round(tabSize)))
      : DEFAULT_EDITOR_TAB_SIZE,
    wordWrap: settings.wordWrap !== false,
    lineNumbers: settings.lineNumbers !== false
  }
}

export function isEditorFeatureEnabled(settings) {
  return settings?.editor?.enabled === true
}
