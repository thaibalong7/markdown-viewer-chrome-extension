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
    // Only renderer-generated Math may retain geometry styles. Raw HTML cannot
    // acquire that privilege by impersonating KaTeX classes or data attributes.
    const mathStyleToken = crypto.randomUUID()
    markdownEngine.mathStyleToken = mathStyleToken
    katex(md, {
      throwOnError: false,
      mathFence: true,
      trust: false,
      transformer: (html) => {
        if (typeof document === 'undefined') return html
        const template = document.createElement('template')
        template.innerHTML = html
        for (const node of template.content.querySelectorAll('[style]')) {
          node.setAttribute('data-mdp-math-style', mathStyleToken)
        }
        return template.innerHTML
      }
    })
  }
}
