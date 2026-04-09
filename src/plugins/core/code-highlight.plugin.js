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

      const copyBtn = document.createElement('button')
      copyBtn.type = 'button'
      copyBtn.className = 'mdp-code-block__copy'
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard')
      copyBtn.setAttribute('title', 'Copy code')

      const copyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      copyIcon.setAttribute('class', 'mdp-code-block__copy-icon')
      copyIcon.setAttribute('viewBox', '0 0 24 24')
      copyIcon.setAttribute('width', '14')
      copyIcon.setAttribute('height', '14')
      copyIcon.setAttribute('aria-hidden', 'true')
      copyIcon.setAttribute('focusable', 'false')

      const copyBack = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      copyBack.setAttribute('x', '9')
      copyBack.setAttribute('y', '9')
      copyBack.setAttribute('width', '11')
      copyBack.setAttribute('height', '11')
      copyBack.setAttribute('rx', '2')
      copyBack.setAttribute('fill', 'none')
      copyBack.setAttribute('stroke', 'currentColor')
      copyBack.setAttribute('stroke-width', '1.8')

      const copyFront = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      copyFront.setAttribute('x', '4')
      copyFront.setAttribute('y', '4')
      copyFront.setAttribute('width', '11')
      copyFront.setAttribute('height', '11')
      copyFront.setAttribute('rx', '2')
      copyFront.setAttribute('fill', 'none')
      copyFront.setAttribute('stroke', 'currentColor')
      copyFront.setAttribute('stroke-width', '1.8')

      copyIcon.appendChild(copyBack)
      copyIcon.appendChild(copyFront)
      copyBtn.appendChild(copyIcon)

      actions.appendChild(langEl)
      actions.appendChild(copyBtn)
      meta.appendChild(actions)

      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(meta)
      wrapper.appendChild(pre)
    }
  }
}
