/**
 * TreeWalker-based text sampling for content scripts (cheap vs full innerText).
 * @param {Node | null | undefined} root
 * @param {number} [maxChars]
 */
export function getTextSample(root, maxChars = 50_000) {
  if (!root) return ''

  const doc = root.ownerDocument
  const defaultView = doc?.defaultView
  const NodeFilterConst =
    defaultView?.NodeFilter ?? (typeof NodeFilter !== 'undefined' ? NodeFilter : null)

  if (!doc || !NodeFilterConst) return ''

  const walker = doc.createTreeWalker(root, NodeFilterConst.SHOW_TEXT)
  let out = ''

  let node
  while ((node = walker.nextNode())) {
    const t = node?.nodeValue || ''
    if (!t.trim()) continue

    if (out) out += '\n'
    out += t

    if (out.length >= maxChars) break
  }

  return out.slice(0, maxChars)
}

/**
 * Quick heuristic: does this text look like Markdown (headings, fences, lists, links)?
 * Used for detector scoring and bootstrap fallback.
 * @param {string} [text]
 */
export function looksLikeMarkdownText(text) {
  const value = String(text || '')
  if (value.length < 200) return false
  return (
    /^(#{1,6}\s+)/m.test(value) ||
    /^```/m.test(value) ||
    /^>\s+/m.test(value) ||
    /^(\-|\*|\+)\s+/m.test(value) ||
    /^\d+\.\s+/m.test(value) ||
    /^(\s*[-*_]{3,}\s*)$/m.test(value) ||
    /\*\*[^*]+\*\*/.test(value) ||
    /\[[^\]]+\]\([^)]+\)/.test(value)
  )
}
