import { PLUGIN_IDS } from '../plugin-types.js'

let emojiPluginPromise = null

function getEmojiPlugin() {
  if (!emojiPluginPromise) {
    emojiPluginPromise = import('markdown-it-emoji').then((module) => module.full)
  }
  return emojiPluginPromise
}

export const emojiPlugin = {
  id: PLUGIN_IDS.EMOJI,
  async extendMarkdown({ markdownEngine }) {
    const emojiFull = await getEmojiPlugin()
    markdownEngine.instance.use(emojiFull)
  }
}
