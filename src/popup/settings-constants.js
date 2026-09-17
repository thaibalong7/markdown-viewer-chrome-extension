import { DEFAULT_SETTINGS } from '../settings/default-settings.js'
import { MERMAID_RENDERERS } from '../plugins/plugin-types.js'

export const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  sakura: 'Sakura',
  matcha: 'Matcha'
}

/** Display names for plugin toggles (keys match `PLUGIN_IDS` / persisted `settings.plugins`). */
export const PLUGIN_LABELS = {
  codeHighlight: 'Code highlight',
  taskList: 'Task list',
  anchorHeading: 'Anchor heading',
  tableEnhance: 'Table enhance',
  emoji: 'Emoji',
  footnote: 'Footnotes',
  math: 'Math (KaTeX)',
  mermaid: 'Mermaid diagrams'
}

/** Short English hints shown under each plugin toggle in the popup. */
export const PLUGIN_HINTS = {
  codeHighlight:
    'Colors fenced code with Shiki. When off, code blocks use plain monospace styling (faster, fewer bytes).',
  taskList: 'Renders GitHub-style task lists. Checkboxes are read-only in the viewer.',
  anchorHeading: 'Adds a “#” control on headings to copy a deep link to that section.',
  tableEnhance: 'Wraps wide tables for horizontal scrolling and slightly richer table chrome.',
  emoji: 'Enables :shortcode:-style emoji where the emoji plugin supports them.',
  footnote: 'Renders footnote markers, definitions, and return links in the document.',
  math: 'Renders LaTeX-style math via KaTeX. Heavier than plain Markdown; enable when needed.',
  mermaid:
    'Renders Mermaid diagrams from ```mermaid``` fences. When on, charts can be exported from the viewer.'
}

/** Parser/syntax package versions shown only when a plugin has a concrete versioned dependency. */
export const PLUGIN_VERSION_NOTES = {
  codeHighlight: 'Syntax support: Shiki 4.0.2.',
  anchorHeading: 'Heading slug support: markdown-it-anchor 9.2.0.',
  emoji: 'Syntax support: markdown-it-emoji 3.0.0.',
  footnote: 'Syntax support: markdown-it-footnote 4.0.0.',
  math: 'Syntax support: @mdit/plugin-katex 0.25.2, KaTeX 0.16.44.',
  mermaid: 'Syntax support: Mermaid 11.13.0 or Beautiful Mermaid 1.1.3.'
}

export const MERMAID_RENDERER_OPTIONS = [
  {
    label: 'Mermaid official',
    value: MERMAID_RENDERERS.OFFICIAL,
    description: 'Best compatibility with Mermaid syntax.'
  },
  {
    label: 'Cursor-like',
    value: MERMAID_RENDERERS.BEAUTIFUL,
    description: 'ELK-based layout similar to Cursor built-in rendering.'
  }
]

export const MERMAID_RENDERER_LABELS = MERMAID_RENDERER_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label
  return labels
}, {})

export const MERMAID_RENDERER_DESCRIPTIONS = MERMAID_RENDERER_OPTIONS.reduce(
  (descriptions, option) => {
    descriptions[option.value] = option.description
    return descriptions
  },
  {}
)

export function createReaderUiDefaultsPatch() {
  return {
    theme: { ...DEFAULT_SETTINGS.theme },
    typography: { ...DEFAULT_SETTINGS.typography },
    layout: { ...DEFAULT_SETTINGS.layout }
  }
}

export const SETTINGS_TAB_IDS = {
  HISTORY: 'history',
  READER: 'reader',
  EDITOR: 'editor',
  PLUGINS: 'plugins'
}

export const SETTINGS_TABS = [
  { id: SETTINGS_TAB_IDS.HISTORY, label: 'History', title: 'Recent files' },
  { id: SETTINGS_TAB_IDS.READER, label: 'Reader', title: 'Reader UI' },
  { id: SETTINGS_TAB_IDS.EDITOR, label: 'Editor', title: 'Editor settings' },
  { id: SETTINGS_TAB_IDS.PLUGINS, label: 'Plugins', title: 'Plugin toggles' }
]

export const FONT_FAMILY_PRESETS = [
  {
    label: 'System UI',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  { label: 'Sans (neutral)', value: 'ui-sans-serif, system-ui, sans-serif' },
  {
    label: 'Sans (Readable / Vietnamese)',
    value: '"Noto Sans", "Inter", "Segoe UI", Roboto, Arial, sans-serif'
  },
  {
    label: 'Sans (Roboto / Arial)',
    value: 'Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  {
    label: 'Sans (Open Sans)',
    value: '"Open Sans", "Segoe UI", Arial, sans-serif'
  },
  {
    label: 'Monospace (Fira Code)',
    value: '"Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  },
  { label: 'Sans (Humanist)', value: 'Verdana, Geneva, sans-serif' },
  {
    label: 'Serif (Georgia)',
    value: 'Georgia, "Times New Roman", "Times", serif'
  },
  {
    label: 'Serif (Noto / Vietnamese)',
    value: '"Noto Serif", "Times New Roman", Times, serif'
  },
  {
    label: 'Serif (Merriweather)',
    value: 'Merriweather, Georgia, "Times New Roman", serif'
  },
  {
    label: 'Serif (Source Serif)',
    value: '"Source Serif 4", "Source Serif Pro", Georgia, serif'
  },
  {
    label: 'Serif (Charter)',
    value: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif'
  },
  {
    label: 'Monospace',
    value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
  },
  {
    label: 'Serif (New York / Georgia)',
    value: '"New York", "Georgia Pro", Georgia, "Times New Roman", serif'
  }
]
