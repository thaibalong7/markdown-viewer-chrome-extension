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
