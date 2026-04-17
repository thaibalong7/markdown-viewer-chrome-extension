import footnote from 'markdown-it-footnote'
import { PLUGIN_IDS } from '../plugin-types.js'

export const footnotePlugin = {
  id: PLUGIN_IDS.FOOTNOTE,
  extendMarkdown({ markdownEngine }) {
    markdownEngine.instance.use(footnote)
  }
}
