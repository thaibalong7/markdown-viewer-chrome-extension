import { findDocumentRanges, revealFindRange } from './document-find.js'
import { MAX_SEARCH_TEXT, searchText } from './text-search.js'

/** Map only consistent source/rendered occurrences. Hidden Markdown syntax falls back to source. */
export function renderedResultRange(article, source, query, match, options) {
  const markers = [...article.querySelectorAll('[data-line]')]
  const start = markers.filter((node) => Number(node.dataset.line) <= match.line - 1)
    .sort((a, b) => Number(b.dataset.line) - Number(a.dataset.line))[0]
  const startLine = start ? Number(start.dataset.line) : 0
  const endLine = Math.min(...markers.map((node) => Number(node.dataset.line)).filter((line) => line > startLine), Infinity)
  const lines = source.split('\n')
  const blockSource = lines.slice(startLine, endLine).join('\n')
  const offset = startLine ? lines.slice(0, startLine).join('\n').length + 1 : 0
  const sourceMatches = searchText(blockSource, query, undefined, options).matches
  const index = sourceMatches.findIndex((item) => item.from + offset === match.from)
  const found = findDocumentRanges(start || article, query, options)
  return !found.limited && index >= 0 && sourceMatches.length === found.ranges.length ? found.ranges[index] : null
}

export async function openWorkspaceSearchResult({ bridge, group, match, query, options, readSource, isCurrent = () => true }) {
  const opened = await bridge?.navigateToFile?.(group.href, { preserveFocus: true })
  if (opened === false || !isCurrent()) return null
  let current = bridge?.getSearchDocument?.()
  if (current?.href !== group.href) return null
  let source = current.text || ''
  if (source.length > MAX_SEARCH_TEXT) return { stale: true }
  // Never navigate to an obsolete offset after a file changes on disk.
  const locate = text => searchText(text, query, undefined, options).matches.find(item => item.from === match.from && item.line === match.line && item.snippet === match.snippet)
  const diskSource = !current.dirty && readSource ? await readSource(group, current) : null
  if (!isCurrent()) return null
  if (diskSource !== null && !locate(diskSource)) return { stale: true }
  let fresh = locate(source)
  if ((!fresh || (diskSource !== null && diskSource !== source)) && !current.dirty) {
    // A same-file navigation normally reuses its displayed snapshot. Refresh it
    // through the guarded document lifecycle before declaring disk hits stale.
    const refreshed = await bridge.navigateToFile?.(group.href, { forceReload: true, preserveFocus: true, syncExplorer: false })
    if (refreshed === false || !isCurrent()) return null
    current = bridge.getSearchDocument?.()
    if (current?.href !== group.href) return null
    source = current.text || ''
    if (source.length > MAX_SEARCH_TEXT) return { stale: true }
    fresh = locate(source)
  }
  if (!fresh) return { stale: true }
  if (current.editor?.revealSearchMatch) {
    current.editor.revealSearchMatch(fresh.from, fresh.to, { preserveFocus: true })
    return { editor: true }
  }
  const article = bridge.getArticleEl?.()
  const range = article && renderedResultRange(article, source, query, fresh, options)
  if (range) {
    bridge.readingPositions?.cancel()
    revealFindRange(range, bridge.getScrollRoot?.())
    return { rendered: true, range }
  }
  return { source, match: fresh, path: group.path }
}
