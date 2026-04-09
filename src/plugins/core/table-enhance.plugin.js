import { PLUGIN_IDS } from '../plugin-types.js'

export const tableEnhancePlugin = {
  id: PLUGIN_IDS.TABLE_ENHANCE,
  afterRender({ articleEl }) {
    if (!articleEl) return

    const tables = articleEl.querySelectorAll('table')
    for (const table of tables) {
      table.classList.add('mdp-table-enhanced')

      const parent = table.parentElement
      if (parent?.classList.contains('mdp-table-wrap')) continue

      const wrapper = document.createElement('div')
      wrapper.className = 'mdp-table-wrap'
      parent?.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    }
  }
}
