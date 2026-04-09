import { PLUGIN_IDS } from '../plugin-types.js'

const TASK_MARKER_RE = /^\s*\[( |x|X)\]\s+/

export const taskListPlugin = {
  id: PLUGIN_IDS.TASK_LIST,
  afterRender({ articleEl }) {
    if (!articleEl) return

    const items = articleEl.querySelectorAll('li')
    for (const item of items) {
      const textNode = item.firstChild
      if (!(textNode instanceof Text)) continue
      const rawText = textNode.textContent || ''
      const match = rawText.match(TASK_MARKER_RE)
      if (!match) continue

      const checked = match[1].toLowerCase() === 'x'
      textNode.textContent = rawText.replace(TASK_MARKER_RE, '')
      item.classList.add('mdp-task-list__item')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = checked
      checkbox.disabled = true
      checkbox.className = 'mdp-task-list__checkbox'
      item.insertBefore(checkbox, item.firstChild)
    }
  }
}
