/**
 * Shiki bundle configuration for the reader. Keep preset keys aligned with
 * `BUILT_IN_THEMES` in `src/theme/index.js`.
 */

import { bundledLanguagesInfo } from 'shiki/bundle/web'

/** Bundled Shiki theme ids — must include one entry per reader preset in the map below (and match `BUILT_IN_THEMES` keys in `src/theme/index.js`). */
export const SHIKI_BUNDLED_THEME_IDS = ['github-light', 'github-dark']

/** Reader `settings.theme.preset` → Shiki `codeToHtml` theme id. */
const PRESET_TO_SHIKI_THEME_ID = {
  light: 'github-light',
  dark: 'github-dark'
}

const SHIKI_BUNDLED_LANG_INFOS = bundledLanguagesInfo.map((info) => ({
  id: String(info?.id || '').toLowerCase(),
  aliases: Array.isArray(info?.aliases)
    ? info.aliases.map((alias) => String(alias || '').toLowerCase()).filter(Boolean)
    : []
}))

/** Full list of grammar ids shipped by `shiki/bundle/web`. */
export const SHIKI_ALL_LANG_IDS = SHIKI_BUNDLED_LANG_INFOS.map(({ id }) => id)

const ALL_LANG_ID_SET = new Set(SHIKI_ALL_LANG_IDS)
const CORE_LANG_CANDIDATES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'html',
  'css',
  'json',
  'markdown',
  'python',
  'bash',
  'shellscript',
  'yaml',
  'sql',
  'java',
  'c',
  'cpp'
]

/** Smaller startup language set; remaining grammars are loaded on demand. */
export const SHIKI_CORE_LANG_IDS = CORE_LANG_CANDIDATES.filter((id) => ALL_LANG_ID_SET.has(id))

const SHIKI_LANG_ID_BY_TOKEN = new Map()
for (const { id, aliases } of SHIKI_BUNDLED_LANG_INFOS) {
  SHIKI_LANG_ID_BY_TOKEN.set(id, id)
  for (const alias of aliases) {
    if (!SHIKI_LANG_ID_BY_TOKEN.has(alias)) {
      SHIKI_LANG_ID_BY_TOKEN.set(alias, id)
    }
  }
}

export function resolveShikiLangId(lang) {
  const token = String(lang || '').trim().toLowerCase()
  if (!token) return null
  return SHIKI_LANG_ID_BY_TOKEN.get(token) || null
}

export function getShikiThemeIdForSettings(settings = {}) {
  const preset = String(settings?.theme?.preset || 'light').toLowerCase()
  return PRESET_TO_SHIKI_THEME_ID[preset] ?? 'github-light'
}
