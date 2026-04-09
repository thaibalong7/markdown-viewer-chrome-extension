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
  [PLUGIN_IDS.MERMAID]: { enabled: false }
}

export function getDefaultPluginSettings() {
  return {
    ...CORE_PLUGIN_DEFAULTS,
    ...OPTIONAL_PLUGIN_DEFAULTS
  }
}
