const WORD_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'word' })
  : null

/**
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text) return 0
  const source = String(text)
  if (!source.trim()) return 0

  if (WORD_SEGMENTER) {
    let count = 0
    for (const segment of WORD_SEGMENTER.segment(source)) {
      if (segment.isWordLike) count += 1
    }
    return count
  }

  return source.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length || 0
}
