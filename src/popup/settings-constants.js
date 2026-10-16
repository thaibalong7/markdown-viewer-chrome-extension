import { DEFAULT_SETTINGS } from '../settings/default-settings.js'
import { MERMAID_RENDERERS } from '../plugins/plugin-types.js'

/** Semantic label IDs for plugin toggles (keys match `PLUGIN_IDS` / persisted `settings.plugins`). */
export const PLUGIN_LABELS = {
  codeHighlight: 'popup.plugins.items.codeHighlight.label',
  taskList: 'popup.plugins.items.taskList.label',
  anchorHeading: 'popup.plugins.items.anchorHeading.label',
  tableEnhance: 'popup.plugins.items.tableEnhance.label',
  emoji: 'popup.plugins.items.emoji.label',
  footnote: 'popup.plugins.items.footnote.label',
  githubAlerts: 'popup.plugins.items.githubAlerts.label',
  colorPreview: 'popup.plugins.items.colorPreview.label',
  math: 'popup.plugins.items.math.label',
  mermaid: 'popup.plugins.items.mermaid.label'
}

/** Semantic hint IDs shown under each plugin toggle in the popup. */
export const PLUGIN_HINTS = {
  codeHighlight: 'popup.plugins.items.codeHighlight.hint',
  taskList: 'popup.plugins.items.taskList.hint',
  anchorHeading: 'popup.plugins.items.anchorHeading.hint',
  tableEnhance: 'popup.plugins.items.tableEnhance.hint',
  emoji: 'popup.plugins.items.emoji.hint',
  footnote: 'popup.plugins.items.footnote.hint',
  githubAlerts: 'popup.plugins.items.githubAlerts.hint',
  colorPreview: 'popup.plugins.items.colorPreview.hint',
  math: 'popup.plugins.items.math.hint',
  mermaid: 'popup.plugins.items.mermaid.hint'
}

/** Parser/syntax package versions shown only when a plugin has a concrete versioned dependency. */
export const PLUGIN_VERSION_NOTES = {
  codeHighlight: 'popup.plugins.items.codeHighlight.version',
  anchorHeading: 'popup.plugins.items.anchorHeading.version',
  emoji: 'popup.plugins.items.emoji.version',
  footnote: 'popup.plugins.items.footnote.version',
  math: 'popup.plugins.items.math.version',
  mermaid: 'popup.plugins.items.mermaid.version'
}

export const MERMAID_RENDERER_OPTIONS = [
  {
    label: 'popup.plugins.mermaidOfficial',
    shortLabel: 'popup.plugins.official',
    value: MERMAID_RENDERERS.OFFICIAL,
    description: 'popup.plugins.broadestMermaidSyntaxSupportAndTheSafestDefault'
  },
  {
    label: 'popup.plugins.cursorLike',
    shortLabel: 'popup.plugins.beautiful',
    value: MERMAID_RENDERERS.BEAUTIFUL,
    description: 'popup.plugins.aCleanerCursorLikeLayoutPoweredByELK'
  }
]

export function createReaderUiDefaultsPatch() {
  return {
    theme: { activeId: DEFAULT_SETTINGS.theme.activeId },
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
    label: 'popup.tabs.reader.label',
    title: 'popup.tabs.reader.title'
  },
  {
    id: SETTINGS_TAB_IDS.EDITOR,
    label: 'popup.tabs.editor.label',
    title: 'popup.tabs.editor.title'
  },
  {
    id: SETTINGS_TAB_IDS.PLUGINS,
    label: 'popup.tabs.plugins.label',
    title: 'popup.tabs.plugins.title'
  },
  {
    id: SETTINGS_TAB_IDS.HISTORY,
    label: 'popup.tabs.history.label',
    title: 'popup.tabs.history.title'
  }
]

export const FONT_FAMILY_PRESETS = [
  {
    label: 'popup.reader.fontFamilies.system',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  { label: 'popup.reader.fontFamilies.sansNeutral', value: 'ui-sans-serif, system-ui, sans-serif' },
  {
    label: 'popup.reader.fontFamilies.sansVietnamese',
    value: '"Noto Sans", "Inter", "Segoe UI", Roboto, Arial, sans-serif'
  },
  {
    label: 'popup.reader.fontFamilies.sansRoboto',
    value: 'Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  {
    label: 'popup.reader.fontFamilies.sansOpenSans',
    value: '"Open Sans", "Segoe UI", Arial, sans-serif'
  },
  {
    label: 'popup.reader.fontFamilies.monoFira',
    value: '"Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  },
  { label: 'popup.reader.fontFamilies.sansHumanist', value: 'Verdana, Geneva, sans-serif' },
  {
    label: 'popup.reader.fontFamilies.serifGeorgia',
    value: 'Georgia, "Times New Roman", "Times", serif'
  },
  {
    label: 'popup.reader.fontFamilies.serifVietnamese',
    value: '"Noto Serif", "Times New Roman", Times, serif'
  },
  {
    label: 'popup.reader.fontFamilies.serifMerriweather',
    value: 'Merriweather, Georgia, "Times New Roman", serif'
  },
  {
    label: 'popup.reader.fontFamilies.serifSource',
    value: '"Source Serif 4", "Source Serif Pro", Georgia, serif'
  },
  {
    label: 'popup.reader.fontFamilies.serifCharter',
    value: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif'
  },
  {
    label: 'popup.reader.fontFamilies.monospace',
    value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
  },
  {
    label: 'popup.reader.fontFamilies.serifNewYork',
    value: '"New York", "Georgia Pro", Georgia, "Times New Roman", serif'
  }
]
