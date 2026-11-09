import { prepareSearchText } from './search-matcher.js'
import { searchText } from './text-search.js'

/** Conservative byte accounting includes original text, both variants and typed maps. */
export function createSearchTextStore({ maxBytes = 32 * 1024 * 1024, maxEntries = 256 } = {}) {
  const entries = new Map()
  let bytes = 0
  function remove(key) { const entry = entries.get(key); if (entry) { bytes -= entry.bytes; entries.delete(key) } }
  const trim = () => { while (bytes > maxBytes || entries.size > maxEntries) remove(entries.keys().next().value) }
  function prepare(key, source, options) {
    let entry = entries.get(key)
    if (entry && source !== undefined && entry.source !== source) { remove(key); entry = null }
    if (!entry) {
      if (source === undefined) return null
      entry = { source, variants: new Map(), bytes: source.length * 2 + key.length * 2 + 128 }
      entries.set(key, entry); bytes += entry.bytes
    }
    entries.delete(key); entries.set(key, entry)
    const accents = options?.diacriticSensitive !== false
    let normalized = entry.variants.get(accents)
    if (!normalized) {
      normalized = prepareSearchText(entry.source, accents)
      const size = normalized.text.length * 2 + (normalized.starts?.byteLength || 0) + (normalized.ends?.byteLength || 0)
      entry.variants.set(accents, normalized); entry.bytes += size; bytes += size
    }
    trim()
    return { source: entry.source, normalized }
  }
  return {
    prepare,
    match({ key, source, query, options, limit }) {
      const entry = prepare(key, source, options)
      return entry ? { ...searchText(entry.source, query, limit, options, entry.normalized), retained: entries.has(key) } : { missing: true }
    },
    release(prefix) { for (const key of entries.keys()) if (key.startsWith(prefix)) remove(key) },
    clear() { entries.clear(); bytes = 0 },
    get bytes() { return bytes },
    get size() { return entries.size }
  }
}
