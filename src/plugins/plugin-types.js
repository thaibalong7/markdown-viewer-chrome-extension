export const PLUGIN_HOOKS = {
  EXTEND_MARKDOWN: 'extendMarkdown',
  PREPROCESS_MARKDOWN: 'preprocessMarkdown',
  POSTPROCESS_HTML: 'postprocessHtml',
  AFTER_RENDER: 'afterRender'
}

export const PLUGIN_IDS = {
  CODE_HIGHLIGHT: 'codeHighlight',
  TASK_LIST: 'taskList',
  ANCHOR_HEADING: 'anchorHeading',
  TABLE_ENHANCE: 'tableEnhance',
  EMOJI: 'emoji',
  FOOTNOTE: 'footnote',
  MATH: 'math',
  MERMAID: 'mermaid'
}

export const MERMAID_RENDERERS = {
  OFFICIAL: 'official',
  BEAUTIFUL: 'beautiful'
}

export const CORE_PLUGIN_DEFAULTS = {
  [PLUGIN_IDS.CODE_HIGHLIGHT]: { enabled: true },
  [PLUGIN_IDS.TASK_LIST]: { enabled: true },
  [PLUGIN_IDS.ANCHOR_HEADING]: { enabled: true },
  [PLUGIN_IDS.TABLE_ENHANCE]: { enabled: true }
}

/** Opt-in: heavier deps or diagrams; emoji/footnote stay on by default. */
export const OPTIONAL_PLUGIN_DEFAULTS = {
  [PLUGIN_IDS.EMOJI]: { enabled: true },
  [PLUGIN_IDS.FOOTNOTE]: { enabled: true },
  [PLUGIN_IDS.MATH]: { enabled: false },
  [PLUGIN_IDS.MERMAID]: { enabled: false, renderer: MERMAID_RENDERERS.OFFICIAL }
}

export function getDefaultPluginSettings() {
  return {
    ...CORE_PLUGIN_DEFAULTS,
    ...OPTIONAL_PLUGIN_DEFAULTS
  }
}

export function mergePluginSettings(pluginSettings = {}) {
  const defaults = getDefaultPluginSettings()
  const merged = {}
  const pluginIds = new Set([...Object.keys(defaults), ...Object.keys(pluginSettings || {})])

  for (const pluginId of pluginIds) {
    merged[pluginId] = {
      ...(defaults[pluginId] || {}),
      ...(pluginSettings?.[pluginId] || {})
    }
  }

  return merged
}
