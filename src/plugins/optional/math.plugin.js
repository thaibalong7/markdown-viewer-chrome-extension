import { PLUGIN_IDS } from '../plugin-types.js'

let katexPluginPromise = null

function getKatexPlugin() {
  if (!katexPluginPromise) {
    katexPluginPromise = import('@mdit/plugin-katex').then((module) => module.katex)
  }
  return katexPluginPromise
}

export const mathPlugin = {
  id: PLUGIN_IDS.MATH,
  async extendMarkdown({ markdownEngine }) {
    const md = markdownEngine.instance
    const katex = await getKatexPlugin()
    katex(md, {
      throwOnError: false,
      mathFence: true
    })
  }
}
