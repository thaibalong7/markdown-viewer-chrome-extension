export const MAX_QUERY_LENGTH = 512
export const MAX_SEARCH_MATCHES = 2000
export const MAX_SEARCH_TEXT = 2 * 1024 * 1024

/** Offsets always refer to the original UTF-16 source, including CRLF. */
export function searchText(source, query, limit = MAX_SEARCH_MATCHES, options, prepared) {
  const value = String(query || '').slice(0, MAX_QUERY_LENGTH)
  const text = String(source || '')
  const matches = []
  if (!value) return { matches, limited: false }
  let line = 1
  let lineStart = 0
  let nextNewline = text.indexOf('\n')
  for (const { from, to } of iterateTextMatches(text, value, options, prepared)) {
    if (matches.length >= limit) return { matches, limited: true }
    while (nextNewline >= 0 && nextNewline < from) {
      lineStart = nextNewline + 1
      ++line
      nextNewline = text.indexOf('\n', lineStart)
    }
    const lineEnd = nextNewline < 0 ? text.length : nextNewline
    // Keep snippets bounded even for minified / very long source lines.
    const snippetStart = Math.max(lineStart, from - 12)
    const snippetEnd = Math.min(lineEnd, to + 48)
    matches.push({
      from, to, line, column: from - lineStart + 1,
      text: text.slice(from, to), snippet: text.slice(snippetStart, snippetEnd).replace(/\r$/, ''),
      snippetFrom: from - snippetStart, snippetTo: to - snippetStart,
      prefix: snippetStart > lineStart, suffix: snippetEnd < lineEnd
    })
  }
  return { matches, limited: false }
}
import { iterateTextMatches } from './search-matcher.js'
