import { MAX_QUERY_LENGTH, MAX_SEARCH_MATCHES, MAX_SEARCH_TEXT } from './text-search.js'
import { iterateTextMatches } from './search-matcher.js'

const EXCLUDED = 'button, input, textarea, select, script, style, svg, [hidden], [inert], [aria-hidden="true"], [data-mdp-ui], .mdp-content-ui-slot, .mdp-ui-state'
const BLOCK = 'p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote, div, section, [data-line]'

/** Read-only DOM index; syntax spans, source, selection and export stay intact. */
export function collectDocumentText(article) {
  const doc = article.ownerDocument
  const walker = doc.createTreeWalker(article, 5)
  const chunks = []
  let text = ''
  let lastBlock = null
  let limited = false
  let node
  const visibility = new WeakMap()
  const visible = (element) => {
    if (!element || element === article) return true
    if (visibility.has(element)) return visibility.get(element)
    const style = doc.defaultView.getComputedStyle(element)
    const value = style.display !== 'none' && style.visibility !== 'hidden' && visible(element.parentElement)
    visibility.set(element, value)
    return value
  }
  while ((node = walker.nextNode())) {
    if (text.length >= MAX_SEARCH_TEXT) { limited = true; break }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR' && !node.closest(EXCLUDED) && visible(node)) text += '\n'
      continue
    }
    const parent = node.parentElement
    if (!node.nodeValue || parent?.closest(EXCLUDED) || !visible(parent)) continue
    const closedDetails = parent.closest('details:not([open])')
    if (closedDetails && !closedDetails.querySelector(':scope > summary')?.contains(node)) continue
    const block = parent.closest(BLOCK) || article
    if (lastBlock && lastBlock !== block) text += '\n'
    if (text.length >= MAX_SEARCH_TEXT) { limited = true; break }
    const length = Math.min(node.length, MAX_SEARCH_TEXT - text.length)
    chunks.push({ node, from: text.length, to: text.length + length })
    text += node.nodeValue.slice(0, length)
    if (length < node.length) { limited = true; break }
    lastBlock = block
  }
  return { text, chunks, limited }
}

export function findDocumentRanges(article, query, options, index, prepared) {
  const value = String(query || '').slice(0, MAX_QUERY_LENGTH)
  if (!article || !value || /[\r\n]/.test(value)) return { ranges: [], limited: false }
  const { text, chunks, limited: textLimited } = index || collectDocumentText(article)
  const ranges = []
  let cursor = 0
  for (const { from, to } of iterateTextMatches(text, value, options, prepared)) {
    if (ranges.length === MAX_SEARCH_MATCHES) return { ranges, limited: true }
    while (chunks[cursor]?.to <= from) ++cursor
    const first = chunks[cursor]
    let end = cursor
    while (chunks[end]?.to < to) ++end
    const last = chunks[end]
    if (!first || !last) continue
    const range = article.ownerDocument.createRange()
    range.setStart(first.node, from - first.from)
    range.setEnd(last.node, to - last.from)
    ranges.push(range)
  }
  return { ranges, limited: textLimited }
}

export function paintFindRanges(article, ranges, active) {
  const win = article?.ownerDocument.defaultView
  const registry = win?.CSS?.highlights
  if (!registry || !win.Highlight) return () => {}
  registry.set('mdp-find', new win.Highlight(...ranges))
  registry.set('mdp-find-current', new win.Highlight(...(ranges[active] ? [ranges[active]] : [])))
  return () => {
    registry.delete('mdp-find')
    registry.delete('mdp-find-current')
  }
}

export function revealFindRange(range, scrollRoot) {
  if (!range || !scrollRoot || !range.getBoundingClientRect) return
  // A hit in a long code line must be visible horizontally as well as vertically.
  for (let node = range.startContainer.parentElement; node && node !== scrollRoot; node = node.parentElement) {
    if (node.scrollWidth <= node.clientWidth) continue
    if (!/auto|scroll/.test(node.ownerDocument.defaultView.getComputedStyle(node).overflowX)) continue
    const target = range.getBoundingClientRect(), clip = node.getBoundingClientRect()
    if (target.left < clip.left + 8) node.scrollLeft += target.left - clip.left - 8
    else if (target.right > clip.right - 8) node.scrollLeft += target.right - clip.right + 8
  }
  const rect = range.getBoundingClientRect()
  const bounds = scrollRoot.getBoundingClientRect()
  if (rect.top >= bounds.top + 90 && rect.bottom <= bounds.bottom - 32) return
  scrollRoot.scrollTo?.({ top: scrollRoot.scrollTop + rect.top - bounds.top - Math.min(140, bounds.height / 3), behavior: 'auto' })
}
