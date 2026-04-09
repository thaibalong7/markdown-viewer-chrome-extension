import { PLUGIN_IDS } from '../plugin-types.js'

const HEADING_SELECTOR = 'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'

export const anchorHeadingPlugin = {
  id: PLUGIN_IDS.ANCHOR_HEADING,
  afterRender({ articleEl }) {
    if (!articleEl) return

    for (const heading of articleEl.querySelectorAll(HEADING_SELECTOR)) {
      if (heading.querySelector('.mdp-heading-anchor')) continue

      const id = heading.getAttribute('id')
      if (!id) continue

      const anchor = document.createElement('a')
      anchor.className = 'mdp-heading-anchor'
      anchor.href = `#${id}`
      anchor.setAttribute('aria-label', 'Copy section link (click)')
      anchor.title = 'Copy link to this section'
      anchor.textContent = '#'
      heading.appendChild(anchor)
    }
  }
}
