export const SYNTAX_THEME_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'github-light', name: 'GitHub Light', colorScheme: 'light' }),
  Object.freeze({ id: 'github-light-high-contrast', name: 'GitHub Light High Contrast', colorScheme: 'light' }),
  Object.freeze({ id: 'light-plus', name: 'Light Plus', colorScheme: 'light' }),
  Object.freeze({ id: 'solarized-light', name: 'Solarized Light', colorScheme: 'light' }),
  Object.freeze({ id: 'catppuccin-latte', name: 'Catppuccin Latte', colorScheme: 'light' }),
  Object.freeze({ id: 'ayu-light', name: 'Ayu Light', colorScheme: 'light' }),
  Object.freeze({ id: 'one-light', name: 'One Light', colorScheme: 'light' }),
  Object.freeze({ id: 'night-owl-light', name: 'Night Owl Light', colorScheme: 'light' }),
  Object.freeze({ id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', colorScheme: 'light' }),
  Object.freeze({ id: 'everforest-light', name: 'Everforest Light', colorScheme: 'light' }),
  Object.freeze({ id: 'gruvbox-light-medium', name: 'Gruvbox Light Medium', colorScheme: 'light' }),
  Object.freeze({ id: 'github-dark', name: 'GitHub Dark', colorScheme: 'dark' }),
  Object.freeze({ id: 'github-dark-high-contrast', name: 'GitHub Dark High Contrast', colorScheme: 'dark' }),
  Object.freeze({ id: 'dark-plus', name: 'Dark Plus', colorScheme: 'dark' }),
  Object.freeze({ id: 'one-dark-pro', name: 'One Dark Pro', colorScheme: 'dark' }),
  Object.freeze({ id: 'dracula', name: 'Dracula', colorScheme: 'dark' }),
  Object.freeze({ id: 'monokai', name: 'Monokai', colorScheme: 'dark' }),
  Object.freeze({ id: 'tokyo-night', name: 'Tokyo Night', colorScheme: 'dark' }),
  Object.freeze({ id: 'catppuccin-mocha', name: 'Catppuccin Mocha', colorScheme: 'dark' }),
  Object.freeze({ id: 'nord', name: 'Nord', colorScheme: 'dark' }),
  Object.freeze({ id: 'solarized-dark', name: 'Solarized Dark', colorScheme: 'dark' }),
  Object.freeze({ id: 'material-theme', name: 'Material Theme', colorScheme: 'dark' }),
  Object.freeze({ id: 'material-theme-palenight', name: 'Material Theme Palenight', colorScheme: 'dark' }),
  Object.freeze({ id: 'ayu-dark', name: 'Ayu Dark', colorScheme: 'dark' }),
  Object.freeze({ id: 'ayu-mirage', name: 'Ayu Mirage', colorScheme: 'dark' }),
  Object.freeze({ id: 'gruvbox-dark-medium', name: 'Gruvbox Dark Medium', colorScheme: 'dark' }),
  Object.freeze({ id: 'night-owl', name: 'Night Owl', colorScheme: 'dark' }),
  Object.freeze({ id: 'rose-pine-moon', name: 'Rosé Pine Moon', colorScheme: 'dark' }),
  Object.freeze({ id: 'everforest-dark', name: 'Everforest Dark', colorScheme: 'dark' }),
  Object.freeze({ id: 'min-dark', name: 'Min Dark', colorScheme: 'dark' })
])

export const BUNDLED_SYNTAX_THEME_IDS = Object.freeze(
  SYNTAX_THEME_DEFINITIONS.map(({ id }) => id)
)

export const DEFAULT_SYNTAX_THEME_ID = 'github-light'

const SYNTAX_THEME_BY_ID = new Map(
  SYNTAX_THEME_DEFINITIONS.map((definition) => [definition.id, definition])
)

const BASE_THEME_TO_SYNTAX_THEME_ID = Object.freeze({
  light: 'github-light',
  'high-contrast-light': 'github-light-high-contrast',
  dark: 'github-dark',
  'high-contrast-dark': 'github-dark-high-contrast',
  sakura: 'rose-pine-dawn',
  matcha: 'everforest-light',
  'solarized-dark': 'solarized-dark',
  'vscode-dark': 'dark-plus',
  dracula: 'dracula',
  gruvbox: 'gruvbox-dark-medium',
  'night-owl': 'night-owl',
  'min-dark': 'min-dark',
  'aurora-glass': 'night-owl',
  solarized: 'solarized-dark'
})

export function isBundledSyntaxThemeId(themeId) {
  return SYNTAX_THEME_BY_ID.has(themeId)
}

export function getSyntaxThemeDefinition(themeId) {
  return SYNTAX_THEME_BY_ID.get(themeId) || null
}

export function getSyntaxThemeIdForBaseTheme(baseThemeId) {
  return BASE_THEME_TO_SYNTAX_THEME_ID[baseThemeId] || DEFAULT_SYNTAX_THEME_ID
}
