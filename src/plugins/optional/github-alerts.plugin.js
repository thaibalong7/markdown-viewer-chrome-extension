import { PLUGIN_IDS } from '../plugin-types.js'
import { createAppIconSvg } from '../../shared/icons/create-app-icon.js'

const ALERT_TYPES = {
  NOTE: { label: 'Note', icon: 'info' },
  TIP: { label: 'Tip', icon: 'check' },
  IMPORTANT: { label: 'Important', icon: 'info' },
  WARNING: { label: 'Warning', icon: 'warning' },
  CAUTION: { label: 'Caution', icon: 'error' }
}
const MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/

function transformAlerts(state) {
  const { tokens } = state
  for (let index = 0; index < tokens.length; index += 1) {
    const open = tokens[index]
    // GitHub alerts are standalone blocks, not nested quotes or list items.
    if (open.type !== 'blockquote_open' || open.level !== 0) continue
    const paragraph = tokens[index + 1]
    const inline = tokens[index + 2]
    if (paragraph?.type !== 'paragraph_open' || inline?.type !== 'inline') continue
    const match = inline.content.match(MARKER_RE)
    if (!match || inline.children?.[0]?.type !== 'text') continue
    const marker = `[!${match[1]}]`
    if (inline.children[0].content.trim() !== marker) continue

    let closeIndex = index + 3
    while (closeIndex < tokens.length) {
      if (tokens[closeIndex].type === 'blockquote_close' && tokens[closeIndex].level === open.level) break
      closeIndex += 1
    }
    const close = tokens[closeIndex]
    if (!close) continue
    const type = match[1].toLowerCase()
    open.tag = close.tag = 'div'
    open.attrJoin('class', `mdp-alert mdp-alert--${type}`)
    open.attrSet('data-mdp-alert', type)
    open.attrSet('role', 'note')
    open.attrSet('aria-label', ALERT_TYPES[match[1]].label)

    // Remove parsed marker tokens without reparsing footnotes, math or links.
    inline.content = inline.content.slice(match[0].length)
    inline.children.shift()
    if (['softbreak', 'hardbreak'].includes(inline.children[0]?.type)) inline.children.shift()
    if (inline.children.length && paragraph.map) {
      paragraph.map = [paragraph.map[0] + 1, paragraph.map[1]]
    }
    const title = new state.Token('mdp_alert_title', '', 0)
    title.content = ALERT_TYPES[match[1]].label
    tokens.splice(index + 1, inline.children.length ? 0 : 3, title)
  }
}

export const githubAlertsPlugin = {
  id: PLUGIN_IDS.GITHUB_ALERTS,
  extendMarkdown({ markdownEngine }) {
    const md = markdownEngine.instance
    md.core.ruler.after('inline', 'mdp_github_alerts', transformAlerts)
    md.renderer.rules.mdp_alert_title = (tokens, index) =>
      `<p class="mdp-alert__title">${tokens[index].content}</p>\n`
  },
  afterRender({ articleEl }) {
    if (!articleEl) return
    for (const title of articleEl.querySelectorAll('.mdp-alert[data-mdp-alert] > .mdp-alert__title')) {
      if (title.querySelector('.mdp-alert__icon')) continue
      const type = title.parentElement.getAttribute('data-mdp-alert').toUpperCase()
      if (!Object.hasOwn(ALERT_TYPES, type)) continue
      title.prepend(createAppIconSvg(ALERT_TYPES[type].icon, {
        width: 18, height: 18, className: 'mdp-alert__icon'
      }))
    }
  }
}
