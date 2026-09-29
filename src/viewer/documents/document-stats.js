import { READING_WORDS_PER_MINUTE } from '../../shared/constants/document-stats.js'
import { countWords } from '../editor/editor-stats.js'

function countCharacters(text) {
  let count = 0
  for (const _character of text) count += 1
  return count
}

/**
 * Derive reader-facing statistics from the original Markdown source.
 * Character count includes whitespace and counts Unicode code points rather than UTF-16 units.
 *
 * @param {unknown} source
 */
export function getDocumentStats(source) {
  const text = typeof source === 'string' ? source : ''
  const wordCount = countWords(text)
  return {
    wordCount,
    characterCount: countCharacters(text),
    readingMinutes: wordCount > 0
      ? Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
      : 0
  }
}
