import { getFileTypeFromUrl } from '../../shared/file-types.js'
import { loadDocument } from '../documents/document-loader.js'
import { MAX_SEARCH_MATCHES, MAX_SEARCH_TEXT, searchText } from './text-search.js'
import { documentDisplayNameFromUrl } from '../documents/document-model.js'

export function workspaceSearchFiles(tree, siblingFiles = []) {
  if (!tree) return siblingFiles.filter((file) => getFileTypeFromUrl(file.href)?.contentKind === 'text')
    .map((file) => ({ href: file.href, path: file.displayName || file.name || documentDisplayNameFromUrl(file.href) }))
  const files = []
  const visit = (node, prefix = '') => {
    if (!node) return
    if (node.type === 'file') {
      if (getFileTypeFromUrl(node.href)?.contentKind === 'text') files.push({ href: node.href, path: `${prefix}${node.name || node.displayName || ''}` })
      return
    }
    for (const child of node.children || []) visit(child, prefix + (node === tree ? '' : `${node.name}/`))
  }
  visit(tree)
  return files
}

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException('Search cancelled.', 'AbortError')
}

/** Sequential bounded I/O avoids flooding the background file bridge. No source index is persisted. */
export async function searchWorkspace({ files, query, options, signal, getReader, getCurrentDocument, onProgress, readDocument = loadDocument, cache, matcher, forceRefresh = false, maxMatches = MAX_SEARCH_MATCHES, maxDurationMs = 15000 }) {
  const result = { groups: [], scanned: 0, total: files.length, skipped: 0, count: 0, limited: false, cached: 0 }
  const started = performance.now()
  let lastProgress = started, publishedCount = 0
  let lastYield = started
  for (const file of files) {
    checkAbort(signal)
    if (performance.now() - started > maxDurationMs) { result.limited = true; break }
    try {
      const current = getCurrentDocument?.()
      const draft = current?.href === file.href && current.dirty
      const reader = getReader?.(file.href)
      const entry = cache ? await cache.read(file, { reader, current, signal, force: forceRefresh, onCacheHit: () => ++result.cached }) : null
      const source = entry ? entry.text : draft ? current.text : (await readDocument({
        href: file.href, fileType: getFileTypeFromUrl(file.href),
        workspaceReader: reader, signal, maxWatchBytes: MAX_SEARCH_TEXT
      })).text
      checkAbort(signal)
      if (String(source).length > MAX_SEARCH_TEXT) { ++result.skipped }
      else {
        const found = matcher ? await matcher.match(entry, query, options, maxMatches - result.count, signal) : searchText(source, query, maxMatches - result.count, options)
        checkAbort(signal)
        if (found.matches.length) result.groups.push({ ...file, matches: found.matches, dirty: Boolean(draft) })
        result.count += found.matches.length
        result.limited ||= found.limited
      }
    } catch (error) {
      checkAbort(signal)
      if (error?.name === 'AbortError') throw error
      if (error?.code === 'search-worker-unavailable') throw error
      // Failed/oversize files are explicitly counted in partial-result UI.
      ++result.skipped
    }
    ++result.scanned
    if ((result.count && !publishedCount) || performance.now() - lastProgress >= 75 || result.scanned === files.length) {
      onProgress?.({ ...result, groups: [...result.groups] })
      lastProgress = performance.now(); publishedCount = result.count
    }
    if (result.count >= maxMatches) { result.limited ||= result.scanned < files.length; break }
    // Worker messaging already yields. Avoid a clamped timer for every warm file;
    // local test hosts/pure callers still yield cooperatively in bounded batches.
    if (!matcher?.offThread && performance.now() - lastYield >= 8) {
      await new Promise(resolve => setTimeout(resolve, 0))
      lastYield = performance.now()
    }
  }
  checkAbort(signal)
  return result
}
