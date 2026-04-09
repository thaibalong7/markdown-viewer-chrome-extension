/**
 * Shiki bundle configuration for the reader. Keep preset keys aligned with
 * `BUILT_IN_THEMES` in `src/theme/index.js`.
 */

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
 * Languages registered in the web bundle. Aliases (e.g. `js`) resolve at highlight time.
 * Unsupported fences keep markdown-it output.
 */
export const SHIKI_LANG_IDS = [
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'json',
  'jsonc',
  'json5',
  'jsonl',
  'html',
  'css',
  'scss',
  'sass',
  'less',
  'shellscript',
  'markdown',
  'yaml',
  'xml',
  'python',
  'java',
  'sql',
  'regexp',
  'vue',
  'graphql',
  'wasm',
  'svelte',
  'astro',
  'php',
  'mdx'
]

export function getShikiThemeIdForSettings(settings = {}) {
  const preset = String(settings?.theme?.preset || 'light').toLowerCase()
  return PRESET_TO_SHIKI_THEME_ID[preset] ?? 'github-light'
}
