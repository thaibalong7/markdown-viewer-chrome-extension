/**
 * Shiki configuration for the reader. Keep preset keys aligned with
 * `BUILT_IN_THEMES` in `src/theme/index.js`.
 */

/** Reader `settings.theme.preset` -> Shiki theme id. */
const PRESET_TO_SHIKI_THEME_ID = {
  light: 'github-light',
  dark: 'github-dark'
}

/**
 * Explicit language module loaders to keep bundle size bounded.
 * Avoid variable dynamic-import paths here, otherwise Vite may include the full language set.
 */
const SHIKI_LANGUAGE_LOADERS = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  jsx: () => import('@shikijs/langs/jsx'),
  tsx: () => import('@shikijs/langs/tsx'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  scss: () => import('@shikijs/langs/scss'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  markdown: () => import('@shikijs/langs/markdown'),
  mdx: () => import('@shikijs/langs/mdx'),
  yaml: () => import('@shikijs/langs/yaml'),
  toml: () => import('@shikijs/langs/toml'),
  bash: () => import('@shikijs/langs/bash'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  powershell: () => import('@shikijs/langs/powershell'),
  python: () => import('@shikijs/langs/python'),
  ruby: () => import('@shikijs/langs/ruby'),
  gherkin: () => import('@shikijs/langs/gherkin'),
  rust: () => import('@shikijs/langs/rust'),
  go: () => import('@shikijs/langs/go'),
  java: () => import('@shikijs/langs/java'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  swift: () => import('@shikijs/langs/swift'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  csharp: () => import('@shikijs/langs/csharp'),
  php: () => import('@shikijs/langs/php'),
  sql: () => import('@shikijs/langs/sql'),
  graphql: () => import('@shikijs/langs/graphql'),
  dockerfile: () => import('@shikijs/langs/dockerfile'),
  nginx: () => import('@shikijs/langs/nginx'),
  diff: () => import('@shikijs/langs/diff'),
  ini: () => import('@shikijs/langs/ini'),
  xml: () => import('@shikijs/langs/xml'),
  vue: () => import('@shikijs/langs/vue'),
  svelte: () => import('@shikijs/langs/svelte'),
  lua: () => import('@shikijs/langs/lua'),
  r: () => import('@shikijs/langs/r'),
  dart: () => import('@shikijs/langs/dart')
}

const SHIKI_THEME_LOADERS = {
  'github-light': () => import('@shikijs/themes/github-light'),
  'github-dark': () => import('@shikijs/themes/github-dark')
}

/** Explicit allowlist of shipped Shiki language ids. */
export const SHIKI_LANG_IDS = Object.keys(SHIKI_LANGUAGE_LOADERS)

/** Theme ids shipped in the reader. */
export const SHIKI_BUNDLED_THEME_IDS = Object.keys(SHIKI_THEME_LOADERS)

/** Smaller startup set; remaining grammars are loaded on demand. */
export const SHIKI_CORE_LANG_IDS = ['javascript', 'typescript', 'json', 'markdown', 'html', 'css', 'bash', 'python']

const SHIKI_LANG_ALIAS_TO_ID = new Map([
  ['js', 'javascript'],
  ['mjs', 'javascript'],
  ['cjs', 'javascript'],
  ['ts', 'typescript'],
  ['mts', 'typescript'],
  ['cts', 'typescript'],
  ['py', 'python'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['zsh', 'bash'],
  ['yml', 'yaml'],
  ['kt', 'kotlin'],
  ['cs', 'csharp'],
  ['c#', 'csharp'],
  ['rb', 'ruby'],
  ['cucumber', 'gherkin'],
  ['feature', 'gherkin'],
  ['md', 'markdown'],
  ['mdwn', 'markdown'],
  ['ps1', 'powershell'],
  ['docker', 'dockerfile']
])

for (const id of SHIKI_LANG_IDS) {
  SHIKI_LANG_ALIAS_TO_ID.set(id, id)
}

export function resolveShikiLangId(lang) {
  const token = String(lang || '').trim().toLowerCase()
  if (!token) return null
  return SHIKI_LANG_ALIAS_TO_ID.get(token) || null
}

export function loadShikiLanguageModule(langId) {
  const loader = SHIKI_LANGUAGE_LOADERS[langId]
  if (!loader) return null
  return loader()
}

export function loadShikiThemeModule(themeId) {
  const loader = SHIKI_THEME_LOADERS[themeId]
  if (!loader) return null
  return loader()
}

export function getShikiThemeIdForSettings(settings = {}) {
  const preset = String(settings?.theme?.preset || 'light').toLowerCase()
  return PRESET_TO_SHIKI_THEME_ID[preset] ?? 'github-light'
}
