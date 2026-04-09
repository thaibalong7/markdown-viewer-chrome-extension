import { PLUGIN_IDS } from '../plugin-types.js'

/**
 * Syntax highlighting is done after markdown-it render via Shiki (see `renderer.js`).
 * This plugin only participates in enable/disable via settings; no markdown-it `highlight` hook.
 */
export const codeHighlightPlugin = {
  id: PLUGIN_IDS.CODE_HIGHLIGHT
}
