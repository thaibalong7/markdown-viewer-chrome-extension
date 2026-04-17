import { PLUGIN_IDS } from '../plugin-types.js'

let footnotePluginPromise = null

function getFootnotePlugin() {
  if (!footnotePluginPromise) {
    footnotePluginPromise = import('markdown-it-footnote').then((module) => module.default)
  }
  return footnotePluginPromise
}

export const footnotePlugin = {
  id: PLUGIN_IDS.FOOTNOTE,
  async extendMarkdown({ markdownEngine }) {
    const footnote = await getFootnotePlugin()
    markdownEngine.instance.use(footnote)
  }
}
