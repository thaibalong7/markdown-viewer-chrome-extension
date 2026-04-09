import footnote from 'markdown-it-footnote'
import { PLUGIN_IDS } from '../plugin-types.js'

export const footnotePlugin = {
  id: PLUGIN_IDS.FOOTNOTE,
  extendMarkdown({ markdownEngine, pluginSettings }) {
    if (pluginSettings?.[PLUGIN_IDS.FOOTNOTE]?.enabled === false) return
    markdownEngine.instance.use(footnote)
  }
}
