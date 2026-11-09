export const DEFAULT_SEARCH_OPTIONS = Object.freeze({ caseSensitive: false, wholeWord: false, diacriticSensitive: true })
const WORD_CHARACTER = /[\p{L}\p{N}\p{M}_]/u

function fold(value, diacriticSensitive) {
  const decomposed = value.normalize('NFD')
  return diacriticSensitive ? decomposed : decomposed.replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

/** Map normalized search units back to entire original base/mark clusters. */
export function prepareSearchText(source, diacriticSensitive = true) {
  const text = fold(source, diacriticSensitive)
  if (text === source || (text.length === source.length && !/\p{M}/u.test(source))) return { text }
  const starts = new Uint32Array(text.length), ends = new Uint32Array(text.length)
  let offset = 0
  for (const cluster of source.matchAll(/\P{M}\p{M}*|\p{M}+/gu)) {
    const value = fold(cluster[0], diacriticSensitive)
    for (let index = 0; index < value.length; ++index) {
      starts[offset] = cluster.index
      ends[offset++] = cluster.index + cluster[0].length
    }
  }
  return { text, starts, ends }
}

function wordBefore(text, offset) {
  if (!offset) return false
  const last = text.charCodeAt(offset - 1)
  const start = last >= 0xdc00 && last <= 0xdfff ? offset - 2 : offset - 1
  return WORD_CHARACTER.test(text.slice(Math.max(0, start), offset))
}

/** Literal Unicode matching; offsets always refer to the original UTF-16 text. */
export function* iterateTextMatches(source, query, options = DEFAULT_SEARCH_OPTIONS, prepared) {
  const { caseSensitive = false, wholeWord = false, diacriticSensitive = true } = options
  const needle = fold(query, diacriticSensitive)
  if (!needle) return
  const normalized = prepared || prepareSearchText(source, diacriticSensitive)
  // A plain "a" must not consume the base of "ả" when accents are significant.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(escaped + (diacriticSensitive ? '(?!\\p{M})' : ''), caseSensitive ? 'gu' : 'giu')
  for (const match of normalized.text.matchAll(pattern)) {
    const from = normalized.starts ? normalized.starts[match.index] : match.index
    const to = normalized.ends ? normalized.ends[match.index + match[0].length - 1] : match.index + match[0].length
    if (wholeWord && (wordBefore(source, from) || WORD_CHARACTER.test(String.fromCodePoint(source.codePointAt(to) || 0)))) continue
    yield { from, to }
  }
}
