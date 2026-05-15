export const DEFAULT_EDITOR_FONT_SIZE_PX = 14
export const DEFAULT_EDITOR_TAB_SIZE = 2
export const DEFAULT_EDITOR_WORD_WRAP = true
export const DEFAULT_EDITOR_LINE_NUMBERS = true
export const EDITOR_LINE_HEIGHT = 1.5
/** Matches `.cm-gutters` minWidth — status bar left padding aligns with this. */
export const EDITOR_GUTTER_MIN_WIDTH_PX = 40

export const DEFAULT_EDITOR_SETTINGS = {
  fontSize: DEFAULT_EDITOR_FONT_SIZE_PX,
  tabSize: DEFAULT_EDITOR_TAB_SIZE,
  wordWrap: DEFAULT_EDITOR_WORD_WRAP,
  lineNumbers: DEFAULT_EDITOR_LINE_NUMBERS
}

export function normalizeEditorSettings(settings = {}) {
  const fontSize = Number(settings.fontSize)
  const tabSize = Number(settings.tabSize)

  return {
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
