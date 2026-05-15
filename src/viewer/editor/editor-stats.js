/**
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text) return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
