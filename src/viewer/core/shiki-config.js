/**
 * Shiki bundle configuration for the reader. Keep preset keys aligned with
 * `BUILT_IN_THEMES` in `src/theme/index.js`.
 */

import { bundledLanguagesInfo } from 'shiki/bundle/web'

/** Bundled Shiki theme ids — must include one entry per reader preset in the map below (and match `BUILT_IN_THEMES` keys in `src/theme/index.js`). */
export const SHIKI_BUNDLED_THEME_IDS = ['github-light', 'github-dark', 'light-plus', 'dark-plus']

/** Reader `settings.theme.preset` → Shiki `codeToHtml` theme id. */
const PRESET_TO_SHIKI_THEME_ID = {
  light: 'github-light',
  dark: 'github-dark',
  'vscode-light-plus': 'light-plus',
  'vscode-dark-plus': 'dark-plus'
}

/**
 * Language grammars to register with `createHighlighter`.
 *
 * **Must stay within `shiki/bundle/web`:** that entry only ships a fixed subset of
 * grammars (see `bundledLanguagesInfo` in Shiki). Any other id (e.g. `asciidoc`, `rust`,
 * `go`) is *not* in this bundle — passing it makes `createHighlighter` throw and
 * disables highlighting for every fence.
 *
 * Fence aliases (`js`, `bash`, `yml`, …) still work when the parent grammar is loaded.
 */
export const SHIKI_LANG_IDS = bundledLanguagesInfo.map(({ id }) => id)

export function getShikiThemeIdForSettings(settings = {}) {
  const preset = String(settings?.theme?.preset || 'light').toLowerCase()
  return PRESET_TO_SHIKI_THEME_ID[preset] ?? 'github-light'
}
