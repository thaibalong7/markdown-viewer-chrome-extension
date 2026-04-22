import { PLUGIN_IDS } from '../plugin-types.js'

let katexPluginPromise = null
let katexCssPromise = null

function getKatexPlugin() {
  if (!katexPluginPromise) {
    katexPluginPromise = import('@mdit/plugin-katex').then((module) => module.katex)
  }
  return katexPluginPromise
}

function getKatexCss() {
  if (!katexCssPromise) {
    katexCssPromise = import('katex/dist/katex.min.css?inline').then(
      (module) => module.default || ''
    )
  }
  return katexCssPromise
}

export const mathPlugin = {
  id: PLUGIN_IDS.MATH,
  async extendMarkdown({ markdownEngine, injectViewerStyles }) {
    const md = markdownEngine.instance
    const [katex, katexCss] = await Promise.all([getKatexPlugin(), getKatexCss()])
    if (typeof injectViewerStyles === 'function' && katexCss) {
      injectViewerStyles({
        id: 'katex-runtime-css',
        cssText: katexCss
      })
    }
    katex(md, {
      throwOnError: false,
      mathFence: true
    })
  }
}
