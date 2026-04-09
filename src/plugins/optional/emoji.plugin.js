import { full as emojiFull } from 'markdown-it-emoji'
import { PLUGIN_IDS } from '../plugin-types.js'

export const emojiPlugin = {
  id: PLUGIN_IDS.EMOJI,
  extendMarkdown({ markdownEngine, pluginSettings }) {
    if (pluginSettings?.[PLUGIN_IDS.EMOJI]?.enabled === false) return
    markdownEngine.instance.use(emojiFull)
  }
}
