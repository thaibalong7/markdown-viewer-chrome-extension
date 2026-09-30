/**
 * Shiki configuration for the reader. Keep explicit loaders aligned with
 * `SYNTAX_THEME_DEFINITIONS` in `src/theme/syntax-themes.js`.
 */

import { getSyntaxThemeIdForSettings } from '../../theme/index.js'

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
  'github-light-high-contrast': () => import('@shikijs/themes/github-light-high-contrast'),
  'light-plus': () => import('@shikijs/themes/light-plus'),
  'solarized-light': () => import('@shikijs/themes/solarized-light'),
  'catppuccin-latte': () => import('@shikijs/themes/catppuccin-latte'),
  'ayu-light': () => import('@shikijs/themes/ayu-light'),
  'one-light': () => import('@shikijs/themes/one-light'),
  'night-owl-light': () => import('@shikijs/themes/night-owl-light'),
  'rose-pine-dawn': () => import('@shikijs/themes/rose-pine-dawn'),
  'everforest-light': () => import('@shikijs/themes/everforest-light'),
  'gruvbox-light-medium': () => import('@shikijs/themes/gruvbox-light-medium'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-dark-high-contrast': () => import('@shikijs/themes/github-dark-high-contrast'),
  'dark-plus': () => import('@shikijs/themes/dark-plus'),
  'one-dark-pro': () => import('@shikijs/themes/one-dark-pro'),
  dracula: () => import('@shikijs/themes/dracula'),
  monokai: () => import('@shikijs/themes/monokai'),
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
  'catppuccin-mocha': () => import('@shikijs/themes/catppuccin-mocha'),
  nord: () => import('@shikijs/themes/nord'),
  'solarized-dark': () => import('@shikijs/themes/solarized-dark'),
  'material-theme': () => import('@shikijs/themes/material-theme'),
  'material-theme-palenight': () => import('@shikijs/themes/material-theme-palenight'),
  'ayu-dark': () => import('@shikijs/themes/ayu-dark'),
  'ayu-mirage': () => import('@shikijs/themes/ayu-mirage'),
  'gruvbox-dark-medium': () => import('@shikijs/themes/gruvbox-dark-medium'),
  'night-owl': () => import('@shikijs/themes/night-owl'),
  'rose-pine-moon': () => import('@shikijs/themes/rose-pine-moon'),
  'everforest-dark': () => import('@shikijs/themes/everforest-dark'),
  'min-dark': () => import('@shikijs/themes/min-dark')
}

/** Explicit allowlist of shipped Shiki language ids. */
export const SHIKI_LANG_IDS = Object.keys(SHIKI_LANGUAGE_LOADERS)

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
  return getSyntaxThemeIdForSettings(settings)
}
