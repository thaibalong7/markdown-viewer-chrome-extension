import { PLUGIN_IDS } from '../plugin-types.js'

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
  afterRender({ articleEl, pluginSettings }) {
    if (pluginSettings?.[PLUGIN_IDS.CODE_HIGHLIGHT]?.enabled === false) return
    if (!articleEl) return

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

      const actions = document.createElement('div')
      actions.className = 'mdp-code-block__actions'

      const langEl = document.createElement('span')
      langEl.className = 'mdp-code-block__lang'
      langEl.textContent = lang || 'text'

      const sep = document.createElement('span')
      sep.className = 'mdp-code-block__sep'
      sep.setAttribute('aria-hidden', 'true')

      const copyBtn = document.createElement('button')
      copyBtn.type = 'button'
      copyBtn.className = 'mdp-code-block__copy'
      copyBtn.textContent = 'Copy'
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard')

      actions.appendChild(langEl)
      actions.appendChild(sep)
      actions.appendChild(copyBtn)
      meta.appendChild(actions)

      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(meta)
      wrapper.appendChild(pre)
    }
  }
}
