import { katex } from '@mdit/plugin-katex'
import { PLUGIN_IDS } from '../plugin-types.js'

export const mathPlugin = {
  id: PLUGIN_IDS.MATH,
  extendMarkdown({ markdownEngine }) {
    const md = markdownEngine.instance
    katex(md, {
      throwOnError: false,
      mathFence: true
    })
  }
}
