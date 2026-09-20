import { DEFAULT_SETTINGS } from '../settings/default-settings.js'
import { MERMAID_RENDERERS } from '../plugins/plugin-types.js'

export const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  sakura: 'Sakura',
  matcha: 'Matcha',
  'solarized-dark': 'Solarized Dark'
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
  codeHighlight: 'Highlights fenced code with Shiki; turn it off for a lighter plain-code view.',
  taskList: 'Renders GitHub-style task lists with read-only checkboxes.',
  anchorHeading: 'Adds a “#” action to headings for copying deep links.',
  tableEnhance: 'Makes wide tables scrollable with enhanced table styling.',
  emoji: 'Converts supported :shortcode: text into emoji.',
  footnote: 'Adds footnote markers, definitions, and return links.',
  math: 'Renders LaTeX-style math with KaTeX when needed.',
  mermaid: 'Renders Mermaid code fences as diagrams with export actions.'
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
    shortLabel: 'Official',
    value: MERMAID_RENDERERS.OFFICIAL,
    description: 'Broadest Mermaid syntax support and the safest default.'
  },
  {
    label: 'Cursor-like',
    shortLabel: 'Beautiful',
    value: MERMAID_RENDERERS.BEAUTIFUL,
    description: 'A cleaner, Cursor-like layout powered by ELK.'
  }
]

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
  {
    id: SETTINGS_TAB_IDS.READER,
    label: 'Reader',
    title: 'Reading appearance'
  },
  {
    id: SETTINGS_TAB_IDS.EDITOR,
    label: 'Editor',
    title: 'Editor preferences'
  },
  {
    id: SETTINGS_TAB_IDS.PLUGINS,
    label: 'Plugins',
    title: 'Markdown features'
  },
  {
    id: SETTINGS_TAB_IDS.HISTORY,
    label: 'Recent',
    title: 'Recent files'
  }
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
