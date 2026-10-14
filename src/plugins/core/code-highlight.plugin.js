import { PLUGIN_IDS } from '../plugin-types.js'
import { mountContentUi, batchContentUi } from '../../viewer/react/content/mount-content-ui.jsx'
import { CodeToolbar } from '../../viewer/react/content/toolbars/CodeToolbar.jsx'

const PRE_SELECTOR = '.mdp-markdown-body pre'

function inferLangFromPre(pre) {
  const fromData = pre.getAttribute('data-mdp-lang')
  if (fromData) return fromData
  const code = pre.querySelector(':scope > code')
  if (!code) return ''
  const m = String(code.className || '').match(/(?:^|\s)language-([\w-]*)/)
  return m ? m[1] : ''
}

/** After Shiki: wrap `<pre>` in `.mdp-code-block` (language label + Copy). Skips `mermaid`. */
export const codeHighlightPlugin = {
  id: PLUGIN_IDS.CODE_HIGHLIGHT,
  afterRender({ articleEl, copyCodeWithToast }) {
    if (!articleEl) return

    const cleanups = []
    batchContentUi(articleEl, () => {
      for (const pre of articleEl.querySelectorAll(PRE_SELECTOR)) {
        if (!(pre instanceof HTMLPreElement)) continue
        if (pre.parentElement?.classList.contains('mdp-code-block')) continue

        const parent = pre.parentElement
        if (!parent) continue

        const lang = inferLangFromPre(pre)
        if (String(lang).toLowerCase() === 'mermaid') continue
        const wrapper = document.createElement('div')
        wrapper.className = 'mdp-code-block'

        const meta = document.createElement('div')
        meta.className = 'mdp-code-block__meta'

        parent.insertBefore(wrapper, pre)
        wrapper.appendChild(meta)
        wrapper.appendChild(pre)
        const ui = mountContentUi(meta, CodeToolbar, { language: lang, pre, copyAction: copyCodeWithToast }, { scope: articleEl })
        cleanups.push(() => ui.destroy())
      }
    })
    const viewerRoot = articleEl.closest('#mdp-viewer-root') || articleEl.ownerDocument.body
    return () => {
      const pending = cleanups.splice(0)
      if (pending.length) batchContentUi(viewerRoot, () => pending.forEach(cleanup => cleanup()))
    }
  }
}
