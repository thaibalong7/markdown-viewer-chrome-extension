import { PLUGIN_IDS } from '../plugin-types.js'
import { findColors } from './color-values.js'
import { createColorPopover } from '../../viewer/colors/color-popover-controller.js'

const SKIP = 'a, button, textarea, script, style, svg, math, .katex, .mdp-mermaid, .language-mermaid, [data-mdp-lang="mermaid"], [data-mdp-color], [contenteditable="true"]'
const MAX_SWATCHES = 1000

// Keep the original text nodes and Shiki spans. An empty button contributes no copy text.
function decorate(nodes, matches, doc, swatches) {
  const positions = []
  let offset = 0
  for (const node of nodes) {
    positions.push({ node, start: offset, end: offset + node.data.length })
    offset += node.data.length
  }
  for (const match of matches.reverse()) {
    const position = positions.find(p => p.start <= match.index && p.end > match.index)
    if (!position) continue
    const trigger = doc.createElement('button')
    trigger.type = 'button'
    trigger.className = 'mdp-color-swatch'
    trigger.setAttribute('data-mdp-color', match.source)
    trigger.setAttribute('aria-label', `Copy color ${match.source}`)
    trigger.setAttribute('aria-keyshortcuts', 'ArrowDown')
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-expanded', 'false')
    const { r, g, b, a } = match.color
    trigger.style.setProperty('--mdp-preview-color', `rgba(${r}, ${g}, ${b}, ${a})`)
    const tail = position.node.splitText(match.index - position.start)
    tail.before(trigger)
    swatches.set(trigger, match.color)
  }
}

export const colorPreviewPlugin = {
  id: PLUGIN_IDS.COLOR_PREVIEW,
  afterRender({ articleEl, signal }) {
    if (!articleEl || signal?.aborted || articleEl.querySelector('button.mdp-color-swatch')) return
    const doc = articleEl.ownerDocument
    const swatches = new Map()
    const decorateText = (nodes, allowHex) => {
      if (swatches.size >= MAX_SWATCHES) return
      const text = nodes.map(node => node.data).join('')
      const matches = findColors(text, { allowHex, limit: MAX_SWATCHES - swatches.size })
      decorate(nodes, matches, doc, swatches)
    }
    // Combine syntax spans within each Shiki line, or within an unhighlighted code element.
    for (const code of articleEl.querySelectorAll('code')) {
      if (code.closest(SKIP)) continue
      const lines = [...code.querySelectorAll('.line')]
      for (const scope of lines.length ? lines : [code]) {
        const walker = doc.createTreeWalker(scope, 4 /* SHOW_TEXT */)
        const nodes = []
        while (walker.nextNode()) {
          if (!walker.currentNode.parentElement.closest(SKIP)) nodes.push(walker.currentNode)
        }
        decorateText(nodes, true)
      }
    }
    const walker = doc.createTreeWalker(articleEl, 4 /* SHOW_TEXT */)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const node of nodes) {
      const parent = node.parentElement
      if (!parent || parent.closest(SKIP) || parent.closest('code')) continue
      decorateText([node], Boolean(parent.closest('td, th')))
    }
    if (!swatches.size) return
    const popover = createColorPopover({ articleEl, swatches })
    const cleanup = () => {
      signal?.removeEventListener('abort', cleanup)
      popover.destroy()
      for (const swatch of swatches.keys()) swatch.remove()
      swatches.clear()
    }
    signal?.addEventListener('abort', cleanup, { once: true })
    return cleanup
  }
}
