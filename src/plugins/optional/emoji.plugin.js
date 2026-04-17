import { full as emojiFull } from 'markdown-it-emoji'
import { PLUGIN_IDS } from '../plugin-types.js'

export const emojiPlugin = {
  id: PLUGIN_IDS.EMOJI,
  extendMarkdown({ markdownEngine }) {
    markdownEngine.instance.use(emojiFull)
  }
}
