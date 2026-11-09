import { loadDocument, DocumentTooLargeError } from '../documents/document-loader.js'
import { getFileTypeFromUrl } from '../../shared/file-types.js'
import { MAX_SEARCH_TEXT } from './text-search.js'

export const abortSearch = () => new DOMException('Search cancelled.', 'AbortError')
export function waitForSearch(task, signal) {
  if (signal?.aborted) return Promise.reject(abortSearch())
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(abortSearch()) }
    signal?.addEventListener('abort', abort, { once: true })
    task.then(value => { signal?.removeEventListener('abort', abort); resolve(value) }, error => { signal?.removeEventListener('abort', abort); reject(error) })
  })
}

/** Scope-owned source LRU. Query cancellation releases its waiter, not shared I/O. */
export function createSearchSourceCache({ readDocument = loadDocument, maxBytes = 16 * 1024 * 1024, ttlMs = 5000, now = Date.now } = {}) {
  const entries = new Map(), pending = new Map(), scope = new AbortController()
  const namespace = `search-${Date.now()}-${Math.random().toString(36).slice(2)}`
  let bytes = 0, version = 0
  function remove(href) { const old = entries.get(href); if (old) { bytes -= old.bytes; entries.delete(href) } }
  function trim() { while (bytes > maxBytes && entries.size) remove(entries.keys().next().value) }
  function touch(href, entry) { entries.delete(href); entries.set(href, entry); return entry }
  function save(href, source, reader, kind, observed, metadata) {
    if (source.length > MAX_SEARCH_TEXT || new TextEncoder().encode(source).byteLength > MAX_SEARCH_TEXT) throw new DocumentTooLargeError(MAX_SEARCH_TEXT)
    const old = entries.get(href)
    const entry = old?.text === source && old.reader === reader && old.kind === kind ? old : {
      text: source, reader, kind, bytes: source.length * 2 + href.length * 2 + 128,
      key: `${namespace}:${++version}`, workerKnown: false
    }
    remove(href)
    Object.assign(entry, { checked: now(), observed, metadata })
    entries.set(href, entry); bytes += entry.bytes
    trim()
    return entry
  }
  async function read(file, { reader, current, signal, force = false, onCacheHit } = {}) {
    if (scope.signal.aborted || signal?.aborted) throw abortSearch()
    if (current?.href === file.href && current.dirty) return save(file.href, String(current.text || ''), reader, 'draft', current.text)
    const observed = current?.href === file.href ? current.text : undefined
    const old = entries.get(file.href)
    if (!force && old?.kind === 'failure' && old.reader === reader && now() - old.checked < ttlMs) throw old.error
    const valid = old?.kind === 'disk' && old.reader === reader && (observed === undefined || old.observed === observed)
    if (!force && valid && typeof reader?.getFile !== 'function' && now() - old.checked < ttlMs) { onCacheHit?.(); return touch(file.href, old) }
    const existing = pending.get(file.href)
    if (existing && existing.reader === reader && (observed === undefined || existing.observed === observed) && (!force || existing.force)) return waitForSearch(existing.task, signal).then(entry => { onCacheHit?.(); return entry })
    const record = { force, reader, observed }
    record.task = (async () => {
      const snapshot = typeof reader?.getFile === 'function' ? await reader.getFile() : reader
      if (scope.signal.aborted) throw abortSearch()
      const metadata = Number.isFinite(snapshot?.size) && Number.isFinite(snapshot?.lastModified) ? `${snapshot.size}:${snapshot.lastModified}` : null
      if (!force && valid && metadata && old.metadata === metadata) {
        onCacheHit?.()
        if (pending.get(file.href) !== record) return old
        old.checked = now(); return touch(file.href, old)
      }
      const loaded = await readDocument({ href: file.href, fileType: getFileTypeFromUrl(file.href), workspaceReader: snapshot, signal: scope.signal, maxWatchBytes: MAX_SEARCH_TEXT })
      if (scope.signal.aborted) throw abortSearch()
      if (pending.get(file.href) !== record) return { text: loaded.text, key: `${namespace}:${++version}`, workerKnown: false }
      return save(file.href, String(loaded.text || ''), reader, 'disk', observed, metadata)
    })().catch(error => {
      // Avoid repeatedly fetching unchanged oversized/inaccessible file URLs.
      // Handles still validate fresh metadata; manual refresh always retries.
      if (!scope.signal.aborted && error?.name !== 'AbortError' && typeof reader?.getFile !== 'function' && pending.get(file.href) === record) {
        remove(file.href)
        const entry = { kind: 'failure', reader, checked: now(), error, bytes: 1024 + file.href.length * 2 }
        entries.set(file.href, entry); bytes += entry.bytes; trim()
      }
      throw error
    }).finally(() => { if (pending.get(file.href) === record) pending.delete(file.href) })
    pending.set(file.href, record)
    return waitForSearch(record.task, signal)
  }
  return { namespace, read, dispose() { scope.abort(); pending.clear(); entries.clear(); bytes = 0 }, get bytes() { return bytes }, get size() { return entries.size } }
}
